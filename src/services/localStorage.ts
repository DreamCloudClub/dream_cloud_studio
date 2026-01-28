// Local Storage Service
// Handles local file system operations via Tauri
// Falls back to web-based storage when not running in Tauri

import type { AssetType } from '@/types/database'

// Check if we're running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// Dynamic import for Tauri API (only loads in Tauri context)
async function getTauriInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke | null> {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    console.warn('Failed to load Tauri API')
    return null
  }
}

// File result from Tauri commands
export interface FileResult {
  success: boolean
  path: string | null
  error: string | null
}

// Asset info for Tauri commands
export interface AssetInfo {
  id: string
  asset_type: string  // 'image' | 'video' | 'audio'
  extension: string   // 'jpg', 'png', 'mp4', 'mp3', etc.
}

// Extract file extension from URL or filename
export function getExtensionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const lastDot = pathname.lastIndexOf('.')
    if (lastDot !== -1) {
      return pathname.substring(lastDot + 1).toLowerCase()
    }
  } catch {
    // Not a valid URL, try as filename
    const lastDot = url.lastIndexOf('.')
    if (lastDot !== -1) {
      return url.substring(lastDot + 1).toLowerCase()
    }
  }
  return 'bin'  // fallback
}

// Get default extension for asset type
export function getDefaultExtension(assetType: AssetType): string {
  switch (assetType) {
    case 'image':
      return 'png'
    case 'video':
      return 'mp4'
    case 'audio':
      return 'mp3'
    default:
      return 'bin'
  }
}

/**
 * Download a file from a URL and save it locally
 * Returns the local file path if successful
 */
export async function downloadAsset(
  url: string,
  assetId: string,
  assetType: AssetType,
  extension?: string
): Promise<{ success: boolean; localPath: string | null; error?: string }> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    // Web fallback - just return the URL as-is (no local storage)
    return {
      success: true,
      localPath: null  // indicates cloud-only
    }
  }

  const ext = extension || getExtensionFromUrl(url) || getDefaultExtension(assetType)

  try {
    const result = await invoke<FileResult>('download_asset', {
      url,
      assetInfo: {
        id: assetId,
        asset_type: assetType,
        extension: ext
      }
    })

    return {
      success: result.success,
      localPath: result.path,
      error: result.error || undefined
    }
  } catch (error) {
    console.error('Failed to download asset:', error)
    return {
      success: false,
      localPath: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Save raw bytes as a local asset
 */
export async function saveAssetBytes(
  bytes: Uint8Array,
  assetId: string,
  assetType: AssetType,
  extension: string
): Promise<{ success: boolean; localPath: string | null; error?: string }> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    return {
      success: false,
      localPath: null,
      error: 'Local storage not available in browser'
    }
  }

  try {
    const result = await invoke<FileResult>('save_asset_bytes', {
      bytes: Array.from(bytes),
      assetInfo: {
        id: assetId,
        asset_type: assetType,
        extension
      }
    })

    return {
      success: result.success,
      localPath: result.path,
      error: result.error || undefined
    }
  } catch (error) {
    console.error('Failed to save asset bytes:', error)
    return {
      success: false,
      localPath: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete a local asset file
 */
export async function deleteLocalAsset(localPath: string): Promise<boolean> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    return true  // Nothing to delete in web mode
  }

  try {
    const result = await invoke<FileResult>('delete_asset', { localPath })
    return result.success
  } catch (error) {
    console.error('Failed to delete asset:', error)
    return false
  }
}

/**
 * Check if a local asset file exists
 */
export async function assetExists(localPath: string): Promise<boolean> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    return false
  }

  try {
    return await invoke<boolean>('asset_exists', { localPath })
  } catch {
    return false
  }
}

/**
 * Get the file size of a local asset
 */
export async function getAssetSize(localPath: string): Promise<number | null> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    return null
  }

  try {
    return await invoke<number | null>('get_asset_size', { localPath })
  } catch {
    return null
  }
}

/**
 * Get the base asset directory path
 */
export async function getAssetDirectory(): Promise<string | null> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    return null
  }

  try {
    return await invoke<string>('get_asset_directory')
  } catch {
    return null
  }
}

/**
 * Generate a new UUID for an asset (from Tauri or fallback)
 */
export async function generateAssetId(): Promise<string> {
  const invoke = await getTauriInvoke()
  if (invoke) {
    try {
      return await invoke<string>('generate_asset_id')
    } catch {
      // Fallback to crypto.randomUUID if Tauri fails
    }
  }

  // Web fallback using crypto API
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Last resort fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * List all local assets of a specific type
 */
export async function listLocalAssets(assetType: AssetType): Promise<string[]> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    return []
  }

  try {
    return await invoke<string[]>('list_local_assets', { assetType })
  } catch {
    return []
  }
}

/**
 * Copy an asset to a new location (for export/sharing)
 */
export async function copyAsset(
  sourcePath: string,
  destinationPath: string
): Promise<{ success: boolean; error?: string }> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    return {
      success: false,
      error: 'Local storage not available in browser'
    }
  }

  try {
    const result = await invoke<FileResult>('copy_asset', {
      sourcePath,
      destinationPath
    })

    return {
      success: result.success,
      error: result.error || undefined
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get total storage used by local assets (in bytes)
 */
export async function getStorageUsage(): Promise<number> {
  const invoke = await getTauriInvoke()
  if (!invoke) {
    return 0
  }

  try {
    return await invoke<number>('get_storage_usage')
  } catch {
    return 0
  }
}

/**
 * Convert a local file path to a Tauri asset URL for display
 * In Tauri 2.0, we use the asset protocol
 */
export function localPathToUrl(localPath: string): string {
  if (!localPath) return ''

  if (isTauri()) {
    // Tauri 2.0 uses the asset protocol with convertFileSrc
    // For now, we'll use a file:// URL which works in Tauri
    return `file://${localPath}`
  }

  // In web mode, return as-is (should be a http/https URL)
  return localPath
}

/**
 * Determine if a path is a local path or a URL
 */
export function isLocalPath(path: string): boolean {
  if (!path) return false
  return path.startsWith('/') || path.startsWith('file://') || /^[a-zA-Z]:[\\/]/.test(path)
}

/**
 * Get the display URL for an asset (handles both local and cloud)
 */
export function getAssetDisplayUrl(asset: {
  url?: string | null
  local_path?: string | null
  storage_type?: string
}): string {
  if (asset.storage_type === 'local' && asset.local_path) {
    return localPathToUrl(asset.local_path)
  }

  if (asset.url) {
    return asset.url
  }

  // Fallback to local_path even if storage_type isn't set
  if (asset.local_path) {
    return localPathToUrl(asset.local_path)
  }

  return ''
}
