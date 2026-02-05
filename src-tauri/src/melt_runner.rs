//! MLT/melt integration for Tauri
//!
//! This module provides Tauri commands for:
//! - Checking melt availability
//! - Running melt for rendering
//! - Tracking render progress
//! - Managing temp files

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use tauri::State;

// ============================================
// TYPES
// ============================================

#[derive(Serialize, Deserialize, Clone)]
pub struct MeltCheckResult {
    pub available: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct RenderOptions {
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub audio_bitrate: Option<String>,
    pub crf: Option<u32>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<u32>,
}

#[derive(Serialize, Deserialize)]
pub struct RenderResult {
    pub success: bool,
    pub error: Option<String>,
    pub output_path: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct MeltRawResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[derive(Serialize, Deserialize)]
pub struct ValidateResult {
    pub valid: bool,
    pub error: Option<String>,
}

// ============================================
// STATE
// ============================================

pub struct MeltState {
    pub active_jobs: Mutex<HashMap<String, bool>>, // job_id -> is_cancelled
}

impl MeltState {
    pub fn new() -> Self {
        Self {
            active_jobs: Mutex::new(HashMap::new()),
        }
    }
}

// ============================================
// TEMP DIRECTORY
// ============================================

fn get_mlt_temp_dir_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let temp_dir = home.join(".dreamcloud").join("mlt-temp");

    if !temp_dir.exists() {
        fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to create MLT temp directory: {}", e))?;
    }

    Ok(temp_dir)
}

fn get_renders_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let renders_dir = home.join(".dreamcloud").join("renders");

    if !renders_dir.exists() {
        fs::create_dir_all(&renders_dir)
            .map_err(|e| format!("Failed to create renders directory: {}", e))?;
    }

    Ok(renders_dir)
}

// ============================================
// MELT AVAILABILITY CHECK
// ============================================

/// Find the melt binary on the system
fn find_melt() -> Option<String> {
    // Try common paths
    let paths = [
        "melt",
        "/usr/bin/melt",
        "/usr/local/bin/melt",
        "/opt/homebrew/bin/melt",
    ];

    for path in &paths {
        if let Ok(output) = Command::new(path).arg("--version").output() {
            if output.status.success() {
                return Some(path.to_string());
            }
        }
    }

    // Try 'which melt'
    if let Ok(output) = Command::new("which").arg("melt").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }

    None
}

// ============================================
// TAURI COMMANDS
// ============================================

#[tauri::command]
pub fn check_melt() -> MeltCheckResult {
    match find_melt() {
        Some(path) => {
            // Get version
            let version = Command::new(&path)
                .arg("--version")
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

            MeltCheckResult {
                available: true,
                version,
                path: Some(path),
                error: None,
            }
        }
        None => MeltCheckResult {
            available: false,
            version: None,
            path: None,
            error: Some("melt not found. Install with: sudo apt install melt".to_string()),
        },
    }
}

#[tauri::command]
pub async fn run_melt_render(
    mlt_xml: String,
    output_path: String,
    options: RenderOptions,
    job_id: String,
    state: State<'_, MeltState>,
) -> Result<RenderResult, String> {
    // Find melt
    let melt_path = find_melt().ok_or("melt not found on system")?;

    // Create temp XML file
    let temp_dir = get_mlt_temp_dir_path()?;
    let xml_path = temp_dir.join(format!("{}.mlt", job_id));

    fs::write(&xml_path, &mlt_xml)
        .map_err(|e| format!("Failed to write MLT XML: {}", e))?;

    // Register job
    {
        let mut jobs = state.active_jobs.lock().map_err(|e| e.to_string())?;
        jobs.insert(job_id.clone(), false);
    }

    // Build melt command
    let mut cmd = Command::new(&melt_path);
    cmd.arg(xml_path.to_string_lossy().to_string());

    // Consumer arguments for output
    let mut consumer = format!("avformat:{}", output_path);

    if let Some(ref vcodec) = options.video_codec {
        cmd.arg(format!("vcodec={}", vcodec));
    }
    if let Some(ref acodec) = options.audio_codec {
        cmd.arg(format!("acodec={}", acodec));
    }
    if let Some(ref abitrate) = options.audio_bitrate {
        cmd.arg(format!("ab={}", abitrate));
    }
    if let Some(crf) = options.crf {
        cmd.arg(format!("crf={}", crf));
    }
    if let Some(width) = options.width {
        cmd.arg(format!("width={}", width));
    }
    if let Some(height) = options.height {
        cmd.arg(format!("height={}", height));
    }
    if let Some(fr) = options.frame_rate {
        cmd.arg(format!("frame_rate_num={}", fr));
    }

    // Add x264 preset for speed
    cmd.arg("preset=medium");

    cmd.arg("-consumer");
    cmd.arg(&consumer);

    // Capture progress output
    cmd.arg("-progress");

    // Run the command
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run melt: {}", e))?;

    // Cleanup job registration
    {
        let mut jobs = state.active_jobs.lock().map_err(|e| e.to_string())?;
        jobs.remove(&job_id);
    }

    // Clean up temp XML
    let _ = fs::remove_file(&xml_path);

    if output.status.success() {
        Ok(RenderResult {
            success: true,
            error: None,
            output_path: Some(output_path),
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(RenderResult {
            success: false,
            error: Some(format!("melt exited with error: {}", stderr)),
            output_path: None,
        })
    }
}

#[tauri::command]
pub async fn cancel_melt_render(
    job_id: String,
    state: State<'_, MeltState>,
) -> Result<bool, String> {
    let mut jobs = state.active_jobs.lock().map_err(|e| e.to_string())?;
    if let Some(cancelled) = jobs.get_mut(&job_id) {
        *cancelled = true;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn get_mlt_temp_dir() -> Result<String, String> {
    let dir = get_mlt_temp_dir_path()?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn cleanup_mlt_temp_files() -> Result<(), String> {
    let temp_dir = get_mlt_temp_dir_path()?;

    if temp_dir.exists() {
        let entries = fs::read_dir(&temp_dir)
            .map_err(|e| format!("Failed to read temp dir: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let _ = fs::remove_file(&path);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn run_melt_raw(args: Vec<String>) -> Result<MeltRawResult, String> {
    let melt_path = find_melt().ok_or("melt not found on system")?;

    let output = Command::new(&melt_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run melt: {}", e))?;

    Ok(MeltRawResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
pub fn validate_mlt_xml(mlt_xml: String) -> Result<ValidateResult, String> {
    let melt_path = match find_melt() {
        Some(p) => p,
        None => return Ok(ValidateResult {
            valid: false,
            error: Some("melt not found".to_string()),
        }),
    };

    // Write XML to temp file
    let temp_dir = get_mlt_temp_dir_path()?;
    let xml_path = temp_dir.join("validate_temp.mlt");

    fs::write(&xml_path, &mlt_xml)
        .map_err(|e| format!("Failed to write temp XML: {}", e))?;

    // Run melt in info mode to validate
    let output = Command::new(&melt_path)
        .arg(xml_path.to_string_lossy().to_string())
        .arg("-consumer")
        .arg("xml")
        .output();

    // Cleanup
    let _ = fs::remove_file(&xml_path);

    match output {
        Ok(out) => {
            if out.status.success() {
                Ok(ValidateResult {
                    valid: true,
                    error: None,
                })
            } else {
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                Ok(ValidateResult {
                    valid: false,
                    error: Some(stderr),
                })
            }
        }
        Err(e) => Ok(ValidateResult {
            valid: false,
            error: Some(format!("Failed to validate: {}", e)),
        }),
    }
}
