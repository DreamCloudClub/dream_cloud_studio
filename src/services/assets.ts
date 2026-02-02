import { supabase, getStorageBucket, getStoragePath, getSignedUrl, getPublicUrl } from '@/lib/supabase'
import type {
  Asset,
  AssetInsert,
  AssetUpdate,
  AssetType,
  AssetCategory,
  AssetStorageType,
  UsageTracking,
  Json,
} from '@/types/database'
import {
  downloadAsset as downloadToLocal,
  deleteLocalAsset,
  generateAssetId,
  getAssetSize,
  isTauri,
  getExtensionFromUrl,
  getDefaultExtension,
  saveAssetBytes,
} from './localStorage'

// ============================================
// ASSET CRUD
// ============================================

export async function getAssets(userId: string, projectId?: string): Promise<Asset[]> {
  let query = supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Asset[]
}

export async function getAssetsByCategory(
  userId: string,
  category: AssetCategory,
  projectId?: string
): Promise<Asset[]> {
  let query = supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Asset[]
}

export async function getAssetsByType(
  userId: string,
  type: AssetType,
  projectId?: string
): Promise<Asset[]> {
  let query = supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Asset[]
}

export async function getAsset(assetId: string): Promise<Asset | null> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Asset
}

export async function createAsset(asset: AssetInsert): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .insert(asset)
    .select()
    .single()

  if (error) throw error
  return data as Asset
}

export async function updateAsset(assetId: string, updates: AssetUpdate): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', assetId)
    .select()
    .single()

  if (error) throw error
  return data as Asset
}

export async function deleteAsset(assetId: string): Promise<void> {
  // Get asset to find storage path
  const asset = await getAsset(assetId)
  if (!asset) return

  // Delete from local storage if it's a local asset
  if (asset.storage_type === 'local' && asset.local_path) {
    try {
      await deleteLocalAsset(asset.local_path)
    } catch (e) {
      console.warn('Failed to delete local asset file:', e)
    }
  }

  // Delete from cloud storage if URL is a Supabase storage URL
  if (asset.url && asset.url.includes('supabase')) {
    try {
      const urlParts = asset.url.split('/storage/v1/object/')
      if (urlParts.length > 1) {
        const pathParts = urlParts[1].split('/')
        const bucket = pathParts[0]
        const path = pathParts.slice(1).join('/')
        await getStorageBucket(bucket as any).remove([path])
      }
    } catch (e) {
      console.warn('Failed to delete asset from storage:', e)
    }
  }

  // Delete from database
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId)

  if (error) throw error
}

// ============================================
// GENERATED ASSET CREATION
// ============================================

export interface GeneratedAssetOptions {
  userId: string
  projectId?: string
  name: string
  type: AssetType
  category?: AssetCategory
  sourceUrl: string  // URL from AI generation service
  userDescription: string  // What the user asked for
  aiPrompt: string  // Actual prompt sent to AI
  generationModel: string  // Model used (e.g., 'flux-1.1-pro', 'kling-1.6')
  generationSettings?: Json  // Model-specific settings
  duration?: number  // For video/audio
}

/**
 * Download an image URL and convert to base64 data URL
 */
async function downloadAsBase64(url: string): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }
    const blob = await response.blob()

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve({ success: true, dataUrl: reader.result as string })
      }
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read blob' })
      }
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Download failed' }
  }
}

/**
 * Create a generated asset with local storage support
 * Downloads the file from the source URL and stores it locally (if in Tauri)
 * Or converts to base64 data URL (in browser mode)
 * Creates the asset record in the database
 */
export async function createGeneratedAsset(options: GeneratedAssetOptions): Promise<Asset> {
  const {
    userId,
    projectId,
    name,
    type,
    category,
    sourceUrl,
    userDescription,
    aiPrompt,
    generationModel,
    generationSettings = {},
    duration,
  } = options

  // Generate a new asset ID
  const assetId = await generateAssetId()

  // Determine storage type and download
  let storageType: AssetStorageType = 'cloud'
  let localPath: string | null = null
  let fileSize: number | null = null
  let finalUrl: string = sourceUrl

  if (isTauri()) {
    // Download to local storage (desktop mode)
    const extension = getExtensionFromUrl(sourceUrl) || getDefaultExtension(type)
    const downloadResult = await downloadToLocal(sourceUrl, assetId, type, extension)

    if (downloadResult.success && downloadResult.localPath) {
      storageType = 'local'
      localPath = downloadResult.localPath
      fileSize = await getAssetSize(localPath)
    } else {
      console.warn('Failed to download to local storage, falling back to cloud:', downloadResult.error)
    }
  } else {
    // Browser mode: upload to Supabase Storage for permanent URLs
    if (type === 'image' || type === 'video' || type === 'audio') {
      console.log(`Browser mode: uploading ${type} to Supabase Storage...`)
      try {
        const response = await fetch(sourceUrl)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        fileSize = blob.size

        const extension = getExtensionFromUrl(sourceUrl) || getDefaultExtension(type)
        const storagePath = `${userId}/${assetId}.${extension}`

        const { error: uploadError } = await getStorageBucket('generated-media').upload(storagePath, blob, {
          cacheControl: '31536000', // 1 year cache
          contentType: blob.type || `${type}/${extension}`,
          upsert: false,
        })

        if (uploadError) throw uploadError

        // Get public URL (permanent, no expiry)
        finalUrl = getPublicUrl('generated-media', storagePath)
        storageType = 'cloud'
        console.log(`Successfully uploaded ${type} to storage, size:`, fileSize)
      } catch (err) {
        console.warn(`Failed to upload ${type} to storage:`, err)
        // Keep original URL as fallback (may expire)
        finalUrl = sourceUrl
      }
    } else {
      // Other types - keep original URL
      console.log(`Browser mode: keeping original URL for ${type}`)
      finalUrl = sourceUrl
      storageType = 'cloud'
    }
  }

  // Create the asset record
  const assetInsert: AssetInsert = {
    id: assetId,
    user_id: userId,
    project_id: projectId || null,
    name,
    type,
    category: category || null,
    url: storageType === 'cloud' ? finalUrl : null,
    duration: duration || null,
    file_size: fileSize,
    metadata: {},
    storage_type: storageType,
    local_path: localPath,
    user_description: userDescription,
    ai_prompt: aiPrompt,
    generation_model: generationModel,
    generation_settings: generationSettings,
  }

  const asset = await createAsset(assetInsert)
  return asset
}

/**
 * Link an asset to a shot as the image asset
 */
export async function linkImageAssetToShot(shotId: string, assetId: string): Promise<void> {
  const { error } = await supabase
    .from('shots')
    .update({ image_asset_id: assetId })
    .eq('id', shotId)

  if (error) throw error
}

/**
 * Link an asset to a shot as the video asset
 */
export async function linkVideoAssetToShot(shotId: string, assetId: string): Promise<void> {
  const { error } = await supabase
    .from('shots')
    .update({ video_asset_id: assetId })
    .eq('id', shotId)

  if (error) throw error
}

/**
 * Unlink the image asset from a shot
 */
export async function unlinkImageAssetFromShot(shotId: string): Promise<void> {
  const { error } = await supabase
    .from('shots')
    .update({ image_asset_id: null })
    .eq('id', shotId)

  if (error) throw error
}

/**
 * Unlink the video asset from a shot
 */
export async function unlinkVideoAssetFromShot(shotId: string): Promise<void> {
  const { error } = await supabase
    .from('shots')
    .update({ video_asset_id: null })
    .eq('id', shotId)

  if (error) throw error
}

/**
 * Link an asset to a shot as the audio asset
 */
export async function linkAudioAssetToShot(shotId: string, assetId: string): Promise<void> {
  const { error } = await supabase
    .from('shots')
    .update({ audio_asset_id: assetId })
    .eq('id', shotId)

  if (error) throw error
}

/**
 * Unlink the audio asset from a shot
 */
export async function unlinkAudioAssetFromShot(shotId: string): Promise<void> {
  const { error } = await supabase
    .from('shots')
    .update({ audio_asset_id: null })
    .eq('id', shotId)

  if (error) throw error
}

/**
 * Get a shot with its linked assets expanded
 */
export async function getShotWithAssets(shotId: string) {
  const { data, error } = await supabase
    .from('shots')
    .select(`
      *,
      image_asset:assets!shots_image_asset_id_fkey(*),
      video_asset:assets!shots_video_asset_id_fkey(*)
    `)
    .eq('id', shotId)
    .single()

  if (error) throw error
  return data
}

// ============================================
// FILE UPLOAD
// ============================================

export type UploadBucket = 'project-assets' | 'mood-board-images' | 'generated-media'

export interface UploadResult {
  url: string
  path: string
  size: number
}

export async function uploadFile(
  userId: string,
  file: File,
  bucket: UploadBucket,
  subfolder?: string
): Promise<UploadResult> {
  const path = getStoragePath(userId, file.name, subfolder)
  const storage = getStorageBucket(bucket)

  const { error: uploadError } = await storage.upload(path, file, {
    cacheControl: '31536000', // 1 year cache
    upsert: false,
  })

  if (uploadError) throw uploadError

  // Get public URL (permanent, no expiry)
  const publicUrl = getPublicUrl(bucket, path)

  return {
    url: publicUrl,
    path,
    size: file.size,
  }
}

export async function uploadAndCreateAsset(
  userId: string,
  file: File,
  options: {
    projectId?: string
    category?: AssetCategory
    bucket?: UploadBucket
    subfolder?: string
  }
): Promise<Asset> {
  // Determine asset type from file
  let type: AssetType = 'image'
  if (file.type.startsWith('video/')) {
    type = 'video'
  } else if (file.type.startsWith('audio/')) {
    type = 'audio'
  }

  // Generate asset ID
  const assetId = await generateAssetId()

  // Get file extension
  const extension = getExtensionFromUrl(file.name) || getDefaultExtension(type)

  // Storage variables
  let storageType: AssetStorageType = 'cloud'
  let localPath: string | null = null
  let finalUrl: string | null = null

  if (isTauri()) {
    // Desktop mode: save file locally
    const bytes = new Uint8Array(await file.arrayBuffer())
    const saveResult = await saveAssetBytes(bytes, assetId, type, extension)

    if (saveResult.success && saveResult.localPath) {
      storageType = 'local'
      localPath = saveResult.localPath
      console.log('Saved upload locally:', localPath)
    } else {
      console.warn('Failed to save locally, falling back to cloud:', saveResult.error)
      // Fall back to cloud upload
      const bucket = options.bucket || 'project-assets'
      const { url } = await uploadFile(userId, file, bucket, options.subfolder)
      finalUrl = url
    }
  } else {
    // Browser mode: upload to Supabase Storage for permanent URLs
    console.log('Browser mode: uploading to Supabase Storage...', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      detectedType: type,
      extension,
    })
    const storagePath = `${userId}/${assetId}.${extension}`

    // Determine content type - use file.type if available, otherwise derive from extension
    let contentType = file.type
    if (!contentType || contentType === 'application/octet-stream') {
      // Fallback content type based on detected asset type and extension
      const mimeTypes: Record<string, string> = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        flac: 'audio/flac',
        mp4: 'video/mp4',
        webm: type === 'audio' ? 'audio/webm' : 'video/webm',
        mov: 'video/quicktime',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
      }
      contentType = mimeTypes[extension] || `${type}/${extension}`
      console.log('Using fallback contentType:', contentType)
    }

    const { error: uploadError } = await getStorageBucket('generated-media').upload(storagePath, file, {
      cacheControl: '31536000', // 1 year cache
      contentType,
      upsert: false,
    })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      throw uploadError
    }

    // Get public URL (permanent, no expiry)
    finalUrl = getPublicUrl('generated-media', storagePath)
    console.log('Uploaded to Supabase Storage:', finalUrl)
  }

  // Extract video duration if it's a video
  let duration: number | null = null
  if (type === 'video') {
    duration = await getVideoDuration(file)
    console.log('Extracted video duration:', duration)
  }

  // Create asset record
  const asset = await createAsset({
    id: assetId,
    user_id: userId,
    project_id: options.projectId || null,
    name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    type,
    category: options.category || null,
    url: finalUrl,
    duration,
    file_size: file.size,
    storage_type: storageType,
    local_path: localPath,
    metadata: {
      original_name: file.name,
      mime_type: file.type,
    },
  })

  return asset
}

// ============================================
// VIDEO DURATION EXTRACTION
// ============================================

/**
 * Extract duration from a video file or URL
 */
export async function getVideoDuration(source: File | string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('error', onError)
      if (video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src)
      }
    }

    const onLoaded = () => {
      const duration = video.duration
      cleanup()
      resolve(isFinite(duration) ? duration : null)
    }

    const onError = () => {
      cleanup()
      resolve(null)
    }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('error', onError)

    if (typeof source === 'string') {
      video.src = source
    } else {
      video.src = URL.createObjectURL(source)
    }
  })
}

/**
 * Sync all video durations - extracts real duration from videos and updates database
 * Also fixes clips that defaulted to 5 seconds
 */
export async function syncAllVideoDurations(
  onProgress?: (current: number, total: number, assetName: string) => void
): Promise<{ updated: number; failed: number }> {
  // Get all video assets with null duration
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, name, url, local_path, storage_type')
    .eq('type', 'video')
    .is('duration', null)

  if (error) throw error
  if (!assets || assets.length === 0) {
    return { updated: 0, failed: 0 }
  }

  let updated = 0
  let failed = 0

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    onProgress?.(i + 1, assets.length, asset.name)

    try {
      // Get the URL to extract duration from
      const url = asset.storage_type === 'local' && asset.local_path
        ? `asset://${asset.local_path}`
        : asset.url

      if (!url) {
        console.warn(`[syncDurations] No URL for asset: ${asset.name}`)
        failed++
        continue
      }

      // Extract duration
      const duration = await getVideoDuration(url)

      if (!duration) {
        console.warn(`[syncDurations] Could not extract duration for: ${asset.name}`)
        failed++
        continue
      }

      console.log(`[syncDurations] ${asset.name}: ${duration}s`)

      // Update asset duration
      await supabase
        .from('assets')
        .update({ duration })
        .eq('id', asset.id)

      // Update any clips using this asset that have the default 5s duration
      await supabase
        .from('timeline_clips')
        .update({ duration })
        .eq('asset_id', asset.id)
        .eq('duration', 5) // Only update clips that still have the default

      updated++
    } catch (err) {
      console.error(`[syncDurations] Error processing ${asset.name}:`, err)
      failed++
    }
  }

  return { updated, failed }
}

// ============================================
// THUMBNAIL GENERATION
// ============================================

export async function generateVideoThumbnail(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = videoUrl
    video.currentTime = 1 // Capture at 1 second

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
      resolve(thumbnail)
    }

    video.onerror = () => reject(new Error('Failed to load video'))
  })
}

// ============================================
// USAGE TRACKING
// ============================================

export async function incrementUsage(
  userId: string,
  type: 'image' | 'video' | 'audio',
  amount: number = 1
): Promise<void> {
  // Get or create usage tracking for current period
  const { data: usage, error: usageError } = await supabase
    .rpc('get_or_create_usage_tracking', { p_user_id: userId })

  if (usageError) throw usageError

  const usageData = usage as UsageTracking

  // Update the appropriate counter
  const updates: Record<string, number> = {}
  if (type === 'image') {
    updates.images_generated = (usageData.images_generated || 0) + amount
  } else if (type === 'video') {
    updates.videos_generated = (usageData.videos_generated || 0) + amount
  } else if (type === 'audio') {
    updates.audio_minutes_used = (usageData.audio_minutes_used || 0) + amount
  }

  const { error } = await supabase
    .from('usage_tracking')
    .update(updates)
    .eq('id', usageData.id)

  if (error) throw error
}

export async function updateStorageUsage(userId: string, bytes: number): Promise<void> {
  const { data: usage, error: usageError } = await supabase
    .rpc('get_or_create_usage_tracking', { p_user_id: userId })

  if (usageError) throw usageError

  const usageData = usage as UsageTracking

  const { error } = await supabase
    .from('usage_tracking')
    .update({
      storage_bytes_used: (usageData.storage_bytes_used || 0) + bytes,
    })
    .eq('id', usageData.id)

  if (error) throw error
}

export async function getCurrentUsage(userId: string): Promise<UsageTracking> {
  const { data, error } = await supabase
    .rpc('get_or_create_usage_tracking', { p_user_id: userId })

  if (error) throw error
  return data as UsageTracking
}

// ============================================
// PLATFORM-RELATED QUERIES
// ============================================

/**
 * Get all assets for a platform (via project_id -> platform_id)
 * Note: This queries assets whose project belongs to the platform
 * In the future, assets could have a direct platform_id field
 */
export async function getAssetsByPlatform(platformId: string): Promise<Asset[]> {
  // First get all projects for this platform
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('platform_id', platformId)

  if (projectsError) throw projectsError

  if (!projects || projects.length === 0) {
    return []
  }

  const projectIds = projects.map(p => p.id)

  // Get assets for these projects
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Asset[]
}

/**
 * Get all assets for a user (alias for getAssets with no projectId)
 */
export async function getAllAssets(userId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Asset[]
}

// ============================================
// ANIMATION ASSET CREATION
// ============================================

export interface AnimationAssetOptions {
  userId: string
  projectId?: string
  name: string
  category?: AssetCategory
  userDescription: string
  animationConfig: Json  // The Remotion AnimationConfig
  duration?: number
}

/**
 * Create an animation asset that stores the Remotion AnimationConfig
 * Animations are rendered on-the-fly by Remotion, so we don't store a URL
 */
export async function createAnimationAsset(options: AnimationAssetOptions): Promise<Asset> {
  const {
    userId,
    projectId,
    name,
    category,
    userDescription,
    animationConfig,
    duration,
  } = options

  // Generate a new asset ID
  const assetId = await generateAssetId()

  // Create the asset record with animation config in generation_settings
  const assetInsert: AssetInsert = {
    id: assetId,
    user_id: userId,
    project_id: projectId || null,
    name,
    type: 'animation',
    category: category || null,
    url: null,  // Animation assets don't have a pre-rendered URL
    duration: duration || null,
    file_size: null,
    metadata: {
      remotion: true,  // Flag to indicate this is a Remotion animation
    },
    storage_type: 'cloud',  // Config is stored in database
    local_path: null,
    user_description: userDescription,
    ai_prompt: userDescription,
    generation_model: 'remotion',
    generation_settings: animationConfig,  // Store the full AnimationConfig here
  }

  const asset = await createAsset(assetInsert)
  return asset
}
