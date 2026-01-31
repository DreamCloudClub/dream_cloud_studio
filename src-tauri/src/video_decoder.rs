use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};

use ffmpeg_next as ffmpeg;
use ffmpeg_next::format::{input, Pixel};
use ffmpeg_next::media::Type;
use ffmpeg_next::software::scaling::{context::Context as ScalingContext, flag::Flags};
use ffmpeg_next::util::frame::video::Video as VideoFrame;

/// Video metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    /// Duration in seconds
    pub duration_secs: f64,
    /// Frames per second
    pub fps: f64,
    /// Video width in pixels
    pub width: u32,
    /// Video height in pixels
    pub height: u32,
    /// Total number of frames (estimated)
    pub frame_count: u64,
    /// Video codec name
    pub codec: String,
    /// Bitrate in bits per second (if available)
    pub bitrate: Option<u64>,
}

/// Handle for an opened video file
#[derive(Debug)]
pub struct VideoHandle {
    pub path: String,
    pub info: VideoInfo,
    pub stream_index: usize,
    pub time_base: ffmpeg::Rational,
}

/// Thread-safe storage for video handles
lazy_static::lazy_static! {
    static ref VIDEO_HANDLES: Mutex<HashMap<String, Arc<VideoHandle>>> = Mutex::new(HashMap::new());
}

/// Error type for video operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoError {
    pub message: String,
    pub code: String,
}

impl std::fmt::Display for VideoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for VideoError {}

impl From<ffmpeg::Error> for VideoError {
    fn from(err: ffmpeg::Error) -> Self {
        VideoError {
            message: err.to_string(),
            code: "FFMPEG_ERROR".to_string(),
        }
    }
}

impl From<std::io::Error> for VideoError {
    fn from(err: std::io::Error) -> Self {
        VideoError {
            message: err.to_string(),
            code: "IO_ERROR".to_string(),
        }
    }
}

/// Initialize FFmpeg (call once at startup)
pub fn init_ffmpeg() -> Result<(), VideoError> {
    ffmpeg::init().map_err(|e| VideoError {
        message: format!("Failed to initialize FFmpeg: {}", e),
        code: "INIT_ERROR".to_string(),
    })
}

/// Get information about a video file without fully opening it
pub fn get_video_info(path: &str) -> Result<VideoInfo, VideoError> {
    let input_ctx = input(&path).map_err(|e| VideoError {
        message: format!("Failed to open video file '{}': {}", path, e),
        code: "OPEN_ERROR".to_string(),
    })?;

    // Find the best video stream
    let video_stream = input_ctx
        .streams()
        .best(Type::Video)
        .ok_or_else(|| VideoError {
            message: "No video stream found in file".to_string(),
            code: "NO_VIDEO_STREAM".to_string(),
        })?;

    let video_stream_index = video_stream.index();

    // Get codec parameters
    let codec_ctx = ffmpeg::codec::context::Context::from_parameters(video_stream.parameters())
        .map_err(|e| VideoError {
            message: format!("Failed to get codec context: {}", e),
            code: "CODEC_ERROR".to_string(),
        })?;

    let decoder = codec_ctx.decoder().video().map_err(|e| VideoError {
        message: format!("Failed to create video decoder: {}", e),
        code: "DECODER_ERROR".to_string(),
    })?;

    // Calculate FPS
    let frame_rate = video_stream.avg_frame_rate();
    let fps = if frame_rate.denominator() != 0 {
        frame_rate.numerator() as f64 / frame_rate.denominator() as f64
    } else {
        // Fallback to r_frame_rate
        let r_frame_rate = video_stream.rate();
        if r_frame_rate.denominator() != 0 {
            r_frame_rate.numerator() as f64 / r_frame_rate.denominator() as f64
        } else {
            30.0 // Default fallback
        }
    };

    // Calculate duration
    let duration_secs = if input_ctx.duration() > 0 {
        input_ctx.duration() as f64 / ffmpeg::ffi::AV_TIME_BASE as f64
    } else {
        // Try to get from stream
        let time_base = video_stream.time_base();
        let stream_duration = video_stream.duration();
        if stream_duration > 0 && time_base.denominator() != 0 {
            stream_duration as f64 * time_base.numerator() as f64 / time_base.denominator() as f64
        } else {
            0.0
        }
    };

    // Estimate frame count
    let frame_count = if video_stream.frames() > 0 {
        video_stream.frames() as u64
    } else {
        (duration_secs * fps).round() as u64
    };

    // Get codec name
    let codec_name = decoder
        .codec()
        .map(|c| c.name().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Get bitrate
    let bitrate = if input_ctx.bit_rate() > 0 {
        Some(input_ctx.bit_rate() as u64)
    } else {
        None
    };

    Ok(VideoInfo {
        duration_secs,
        fps,
        width: decoder.width(),
        height: decoder.height(),
        frame_count,
        codec: codec_name,
        bitrate,
    })
}

/// Open a video file and return a handle for subsequent operations
pub fn open_video(path: &str) -> Result<String, VideoError> {
    // Verify the file exists
    if !Path::new(path).exists() {
        return Err(VideoError {
            message: format!("Video file not found: {}", path),
            code: "FILE_NOT_FOUND".to_string(),
        });
    }

    // Get video info
    let info = get_video_info(path)?;

    // Open input to get stream info
    let input_ctx = input(&path)?;
    let video_stream = input_ctx.streams().best(Type::Video).ok_or_else(|| VideoError {
        message: "No video stream found".to_string(),
        code: "NO_VIDEO_STREAM".to_string(),
    })?;

    let stream_index = video_stream.index();
    let time_base = video_stream.time_base();

    let handle = VideoHandle {
        path: path.to_string(),
        info,
        stream_index,
        time_base,
    };

    // Generate a unique handle ID
    let handle_id = format!("video_{}_{}", uuid::Uuid::new_v4(), path.len());

    // Store the handle
    let mut handles = VIDEO_HANDLES.lock().map_err(|_| VideoError {
        message: "Failed to acquire lock on video handles".to_string(),
        code: "LOCK_ERROR".to_string(),
    })?;
    handles.insert(handle_id.clone(), Arc::new(handle));

    Ok(handle_id)
}

/// Close a video handle and free resources
pub fn close_video(handle_id: &str) -> Result<(), VideoError> {
    let mut handles = VIDEO_HANDLES.lock().map_err(|_| VideoError {
        message: "Failed to acquire lock on video handles".to_string(),
        code: "LOCK_ERROR".to_string(),
    })?;

    handles.remove(handle_id);
    Ok(())
}

/// Encode a video frame as JPEG and return base64 string
fn encode_frame_as_base64_jpeg(frame: &VideoFrame, quality: u8) -> Result<String, VideoError> {
    let width = frame.width();
    let height = frame.height();

    // Create a scaler to convert to RGB24
    let mut scaler = ScalingContext::get(
        frame.format(),
        width,
        height,
        Pixel::RGB24,
        width,
        height,
        Flags::BILINEAR,
    )
    .map_err(|e| VideoError {
        message: format!("Failed to create scaler: {}", e),
        code: "SCALER_ERROR".to_string(),
    })?;

    // Scale/convert the frame to RGB
    let mut rgb_frame = VideoFrame::empty();
    scaler.run(frame, &mut rgb_frame).map_err(|e| VideoError {
        message: format!("Failed to scale frame: {}", e),
        code: "SCALE_ERROR".to_string(),
    })?;

    // Get the RGB data
    let rgb_data = rgb_frame.data(0);
    let stride = rgb_frame.stride(0);

    // Create image buffer - handle stride properly
    let mut img_buffer = Vec::with_capacity((width * height * 3) as usize);
    for y in 0..height as usize {
        let row_start = y * stride;
        let row_end = row_start + (width as usize * 3);
        img_buffer.extend_from_slice(&rgb_data[row_start..row_end]);
    }

    // Create image from raw RGB data
    let img = image::RgbImage::from_raw(width, height, img_buffer).ok_or_else(|| VideoError {
        message: "Failed to create image from frame data".to_string(),
        code: "IMAGE_ERROR".to_string(),
    })?;

    // Encode as JPEG
    let mut jpeg_buffer = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_buffer, quality);
    encoder
        .encode_image(&img)
        .map_err(|e| VideoError {
            message: format!("Failed to encode JPEG: {}", e),
            code: "JPEG_ENCODE_ERROR".to_string(),
        })?;

    // Convert to base64
    Ok(BASE64.encode(&jpeg_buffer))
}

/// Extract a frame at a specific timestamp (in seconds)
pub fn get_frame_at_time(path: &str, timestamp_secs: f64) -> Result<String, VideoError> {
    get_frame_at_time_with_quality(path, timestamp_secs, 85)
}

/// Extract a frame at a specific timestamp with custom JPEG quality (1-100)
pub fn get_frame_at_time_with_quality(
    path: &str,
    timestamp_secs: f64,
    quality: u8,
) -> Result<String, VideoError> {
    let mut input_ctx = input(&path)?;

    // Find video stream
    let video_stream = input_ctx
        .streams()
        .best(Type::Video)
        .ok_or_else(|| VideoError {
            message: "No video stream found".to_string(),
            code: "NO_VIDEO_STREAM".to_string(),
        })?;

    let video_stream_index = video_stream.index();
    let time_base = video_stream.time_base();

    // Create decoder
    let codec_ctx = ffmpeg::codec::context::Context::from_parameters(video_stream.parameters())?;
    let mut decoder = codec_ctx.decoder().video()?;

    // Calculate target timestamp in stream time base
    let target_ts = (timestamp_secs * time_base.denominator() as f64 / time_base.numerator() as f64)
        as i64;

    // Seek to the nearest keyframe before the target timestamp
    input_ctx
        .seek(timestamp_secs as i64 * 1_000_000, ..timestamp_secs as i64 * 1_000_000 + 1_000_000)
        .or_else(|_| {
            // If precise seek fails, try seeking to start
            input_ctx.seek(0, ..)
        })?;

    // Decode frames until we reach or pass the target timestamp
    let mut closest_frame: Option<VideoFrame> = None;
    let mut closest_diff = i64::MAX;

    for (stream, packet) in input_ctx.packets() {
        if stream.index() != video_stream_index {
            continue;
        }

        decoder.send_packet(&packet)?;

        let mut decoded_frame = VideoFrame::empty();
        while decoder.receive_frame(&mut decoded_frame).is_ok() {
            let frame_ts = decoded_frame.pts().unwrap_or(0);
            let diff = (frame_ts - target_ts).abs();

            if diff < closest_diff {
                closest_diff = diff;
                closest_frame = Some(decoded_frame.clone());
            }

            // If we've passed the target and have a frame, we're done
            if frame_ts >= target_ts && closest_frame.is_some() {
                let frame = closest_frame.unwrap();
                return encode_frame_as_base64_jpeg(&frame, quality);
            }
        }

        // Safety limit - don't decode too many frames past target
        if let Some(pts) = packet.pts() {
            if pts > target_ts + (time_base.denominator() as i64 * 2) {
                break;
            }
        }
    }

    // Flush decoder
    decoder.send_eof()?;
    let mut decoded_frame = VideoFrame::empty();
    while decoder.receive_frame(&mut decoded_frame).is_ok() {
        let frame_ts = decoded_frame.pts().unwrap_or(0);
        let diff = (frame_ts - target_ts).abs();

        if diff < closest_diff {
            closest_frame = Some(decoded_frame.clone());
        }
    }

    // Return the closest frame we found
    if let Some(frame) = closest_frame {
        encode_frame_as_base64_jpeg(&frame, quality)
    } else {
        Err(VideoError {
            message: format!("Could not find frame at timestamp {}", timestamp_secs),
            code: "FRAME_NOT_FOUND".to_string(),
        })
    }
}

/// Generate multiple thumbnail frames at regular intervals
pub fn generate_thumbnails(path: &str, interval_secs: f64) -> Result<Vec<String>, VideoError> {
    generate_thumbnails_with_options(path, interval_secs, 60, None)
}

/// Generate thumbnails with custom options
pub fn generate_thumbnails_with_options(
    path: &str,
    interval_secs: f64,
    quality: u8,
    max_thumbnails: Option<usize>,
) -> Result<Vec<String>, VideoError> {
    let info = get_video_info(path)?;

    if info.duration_secs <= 0.0 {
        return Err(VideoError {
            message: "Cannot generate thumbnails for video with zero duration".to_string(),
            code: "ZERO_DURATION".to_string(),
        });
    }

    // Calculate how many thumbnails to generate
    let mut count = (info.duration_secs / interval_secs).ceil() as usize;
    if count == 0 {
        count = 1;
    }

    // Apply max limit if specified
    if let Some(max) = max_thumbnails {
        count = count.min(max);
    }

    // Cap at reasonable maximum
    count = count.min(100);

    let mut thumbnails = Vec::with_capacity(count);

    for i in 0..count {
        let timestamp = i as f64 * interval_secs;
        if timestamp >= info.duration_secs {
            break;
        }

        match get_frame_at_time_with_quality(path, timestamp, quality) {
            Ok(frame) => thumbnails.push(frame),
            Err(e) => {
                // Log error but continue with other frames
                eprintln!("Warning: Failed to extract frame at {}: {}", timestamp, e);
            }
        }
    }

    if thumbnails.is_empty() {
        return Err(VideoError {
            message: "Failed to generate any thumbnails".to_string(),
            code: "NO_THUMBNAILS".to_string(),
        });
    }

    Ok(thumbnails)
}

/// Generate a single thumbnail at a specific percentage through the video
pub fn get_thumbnail_at_percent(path: &str, percent: f64) -> Result<String, VideoError> {
    let info = get_video_info(path)?;
    let timestamp = info.duration_secs * (percent / 100.0).clamp(0.0, 1.0);
    get_frame_at_time_with_quality(path, timestamp, 70)
}

/// Extract the first frame of a video (useful for poster/thumbnail)
pub fn get_first_frame(path: &str) -> Result<String, VideoError> {
    get_frame_at_time_with_quality(path, 0.0, 85)
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Tauri command to get video information
#[tauri::command]
pub async fn cmd_get_video_info(path: String) -> Result<VideoInfo, String> {
    get_video_info(&path).map_err(|e| e.message)
}

/// Tauri command to open a video and get a handle
#[tauri::command]
pub async fn cmd_open_video(path: String) -> Result<String, String> {
    open_video(&path).map_err(|e| e.message)
}

/// Tauri command to close a video handle
#[tauri::command]
pub async fn cmd_close_video(handle_id: String) -> Result<(), String> {
    close_video(&handle_id).map_err(|e| e.message)
}

/// Tauri command to get a frame at a specific timestamp
#[tauri::command]
pub async fn cmd_get_frame_at_time(path: String, timestamp_secs: f64) -> Result<String, String> {
    // Run in blocking task since FFmpeg operations are CPU-intensive
    tokio::task::spawn_blocking(move || get_frame_at_time(&path, timestamp_secs))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
        .map_err(|e| e.message)
}

/// Tauri command to get a frame with custom quality
#[tauri::command]
pub async fn cmd_get_frame_at_time_with_quality(
    path: String,
    timestamp_secs: f64,
    quality: u8,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        get_frame_at_time_with_quality(&path, timestamp_secs, quality)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| e.message)
}

/// Tauri command to generate thumbnails at regular intervals
#[tauri::command]
pub async fn cmd_generate_thumbnails(
    path: String,
    interval_secs: f64,
) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || generate_thumbnails(&path, interval_secs))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
        .map_err(|e| e.message)
}

/// Tauri command to generate thumbnails with options
#[tauri::command]
pub async fn cmd_generate_thumbnails_with_options(
    path: String,
    interval_secs: f64,
    quality: u8,
    max_thumbnails: Option<usize>,
) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || {
        generate_thumbnails_with_options(&path, interval_secs, quality, max_thumbnails)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| e.message)
}

/// Tauri command to get the first frame of a video
#[tauri::command]
pub async fn cmd_get_first_frame(path: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || get_first_frame(&path))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
        .map_err(|e| e.message)
}

/// Tauri command to get a thumbnail at a percentage through the video
#[tauri::command]
pub async fn cmd_get_thumbnail_at_percent(path: String, percent: f64) -> Result<String, String> {
    tokio::task::spawn_blocking(move || get_thumbnail_at_percent(&path, percent))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
        .map_err(|e| e.message)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_video_error_display() {
        let err = VideoError {
            message: "Test error".to_string(),
            code: "TEST_CODE".to_string(),
        };
        assert_eq!(format!("{}", err), "TEST_CODE: Test error");
    }
}
