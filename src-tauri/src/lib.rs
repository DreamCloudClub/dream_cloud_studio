use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;
use uuid::Uuid;

mod video_decoder;
use video_decoder::*;

mod melt_runner;
use melt_runner::*;

/// Result of a file operation
#[derive(Serialize, Deserialize)]
pub struct FileResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

/// Asset metadata for file operations
#[derive(Serialize, Deserialize)]
pub struct AssetInfo {
    pub id: String,
    pub asset_type: String,  // image, video, audio
    pub extension: String,   // jpg, png, mp4, mp3, etc.
}

/// Get the app's asset storage directory
fn get_asset_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let asset_dir = home.join(".dreamcloud").join("assets");

    // Create directory if it doesn't exist
    if !asset_dir.exists() {
        fs::create_dir_all(&asset_dir).map_err(|e| format!("Failed to create asset directory: {}", e))?;
    }

    Ok(asset_dir)
}

/// Get the path for a specific asset type subdirectory
fn get_asset_type_dir(asset_type: &str) -> Result<PathBuf, String> {
    let base_dir = get_asset_dir()?;
    let type_dir = base_dir.join(asset_type);

    if !type_dir.exists() {
        fs::create_dir_all(&type_dir).map_err(|e| format!("Failed to create {} directory: {}", asset_type, e))?;
    }

    Ok(type_dir)
}

/// Download a file from a URL and save it locally
#[tauri::command]
async fn download_asset(url: String, asset_info: AssetInfo) -> Result<FileResult, String> {
    // Get the appropriate directory for this asset type
    let type_dir = get_asset_type_dir(&asset_info.asset_type)?;

    // Create a unique filename using the asset ID
    let filename = format!("{}.{}", asset_info.id, asset_info.extension);
    let file_path = type_dir.join(&filename);

    // Download the file
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download file: {}", e))?;

    if !response.status().is_success() {
        return Ok(FileResult {
            success: false,
            path: None,
            error: Some(format!("HTTP error: {}", response.status())),
        });
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Write to file
    let mut file = fs::File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(FileResult {
        success: true,
        path: Some(file_path.to_string_lossy().to_string()),
        error: None,
    })
}

/// Save raw bytes as a local asset
#[tauri::command]
async fn save_asset_bytes(bytes: Vec<u8>, asset_info: AssetInfo) -> Result<FileResult, String> {
    let type_dir = get_asset_type_dir(&asset_info.asset_type)?;

    let filename = format!("{}.{}", asset_info.id, asset_info.extension);
    let file_path = type_dir.join(&filename);

    let mut file = fs::File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(FileResult {
        success: true,
        path: Some(file_path.to_string_lossy().to_string()),
        error: None,
    })
}

/// Delete a local asset file
#[tauri::command]
async fn delete_asset(local_path: String) -> Result<FileResult, String> {
    let path = PathBuf::from(&local_path);

    if !path.exists() {
        return Ok(FileResult {
            success: true,
            path: None,
            error: None,
        });
    }

    fs::remove_file(&path)
        .map_err(|e| format!("Failed to delete file: {}", e))?;

    Ok(FileResult {
        success: true,
        path: None,
        error: None,
    })
}

/// Check if a local asset exists
#[tauri::command]
async fn asset_exists(local_path: String) -> Result<bool, String> {
    Ok(PathBuf::from(&local_path).exists())
}

/// Get the file size of a local asset
#[tauri::command]
async fn get_asset_size(local_path: String) -> Result<Option<u64>, String> {
    let path = PathBuf::from(&local_path);

    if !path.exists() {
        return Ok(None);
    }

    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    Ok(Some(metadata.len()))
}

/// Get the base asset directory path
#[tauri::command]
async fn get_asset_directory() -> Result<String, String> {
    let dir = get_asset_dir()?;
    Ok(dir.to_string_lossy().to_string())
}

/// Generate a new UUID for an asset
#[tauri::command]
fn generate_asset_id() -> String {
    Uuid::new_v4().to_string()
}

/// List all assets in a directory by type
#[tauri::command]
async fn list_local_assets(asset_type: String) -> Result<Vec<String>, String> {
    let type_dir = get_asset_type_dir(&asset_type)?;

    let entries = fs::read_dir(&type_dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() {
                files.push(path.to_string_lossy().to_string());
            }
        }
    }

    Ok(files)
}

/// Copy an asset to a new location (for export/sharing)
#[tauri::command]
async fn copy_asset(source_path: String, destination_path: String) -> Result<FileResult, String> {
    let source = PathBuf::from(&source_path);
    let dest = PathBuf::from(&destination_path);

    if !source.exists() {
        return Ok(FileResult {
            success: false,
            path: None,
            error: Some("Source file does not exist".to_string()),
        });
    }

    // Create parent directory if needed
    if let Some(parent) = dest.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create destination directory: {}", e))?;
        }
    }

    fs::copy(&source, &dest)
        .map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(FileResult {
        success: true,
        path: Some(dest.to_string_lossy().to_string()),
        error: None,
    })
}

/// Get total storage used by local assets
#[tauri::command]
async fn get_storage_usage() -> Result<u64, String> {
    let asset_dir = get_asset_dir()?;

    fn dir_size(path: &PathBuf) -> std::io::Result<u64> {
        let mut size = 0;
        if path.is_dir() {
            for entry in fs::read_dir(path)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    size += dir_size(&path)?;
                } else {
                    size += entry.metadata()?.len();
                }
            }
        }
        Ok(size)
    }

    dir_size(&asset_dir).map_err(|e| format!("Failed to calculate storage: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize FFmpeg
    if let Err(e) = video_decoder::init_ffmpeg() {
        eprintln!("Warning: Failed to initialize FFmpeg: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(melt_runner::MeltState::new())
        .invoke_handler(tauri::generate_handler![
            // Asset management commands
            download_asset,
            save_asset_bytes,
            delete_asset,
            asset_exists,
            get_asset_size,
            get_asset_directory,
            generate_asset_id,
            list_local_assets,
            copy_asset,
            get_storage_usage,
            // Video decoder commands
            cmd_get_video_info,
            cmd_open_video,
            cmd_close_video,
            cmd_get_frame_at_time,
            cmd_get_frame_at_time_with_quality,
            cmd_generate_thumbnails,
            cmd_generate_thumbnails_with_options,
            cmd_get_first_frame,
            cmd_get_thumbnail_at_percent,
            // MLT/melt render commands
            melt_runner::check_melt,
            melt_runner::run_melt_render,
            melt_runner::cancel_melt_render,
            melt_runner::get_mlt_temp_dir,
            melt_runner::cleanup_mlt_temp_files,
            melt_runner::run_melt_raw,
            melt_runner::validate_mlt_xml,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
