import { supabase, getStorageBucket, getStoragePath, getSignedUrl } from '@/lib/supabase'
import type {
  Asset,
  AssetInsert,
  AssetUpdate,
  AssetType,
  AssetCategory,
  UsageTracking,
} from '@/types/database'

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

  // Delete from storage if URL is a Supabase storage URL
  if (asset.url.includes('supabase')) {
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
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadError) throw uploadError

  // Get signed URL for private buckets
  const signedUrl = await getSignedUrl(bucket, path)

  return {
    url: signedUrl,
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
  const bucket = options.bucket || 'project-assets'
  const { url, path, size } = await uploadFile(userId, file, bucket, options.subfolder)

  // Determine asset type from file
  let type: AssetType = 'image'
  if (file.type.startsWith('video/')) {
    type = 'video'
  } else if (file.type.startsWith('audio/')) {
    type = 'audio'
  }

  // Create asset record
  const asset = await createAsset({
    user_id: userId,
    project_id: options.projectId,
    name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    type,
    category: options.category,
    url,
    file_size: size,
    metadata: {
      original_name: file.name,
      mime_type: file.type,
      storage_path: path,
      storage_bucket: bucket,
    },
  })

  return asset
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
