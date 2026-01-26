import { supabase, getStorageBucket, getStoragePath } from '@/lib/supabase'
import type {
  Platform,
  PlatformInsert,
  PlatformUpdate,
} from '@/types/database'

// ============================================
// PLATFORM CRUD
// ============================================

export async function getPlatforms(userId: string): Promise<Platform[]> {
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as Platform[]
}

export async function getPlatform(platformId: string): Promise<Platform | null> {
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('id', platformId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Platform
}

export async function createPlatform(platform: PlatformInsert): Promise<Platform> {
  const { data, error } = await supabase
    .from('platforms')
    .insert(platform)
    .select()
    .single()

  if (error) throw error
  return data as Platform
}

export async function updatePlatform(platformId: string, updates: PlatformUpdate): Promise<Platform> {
  const { data, error } = await supabase
    .from('platforms')
    .update(updates)
    .eq('id', platformId)
    .select()
    .single()

  if (error) throw error
  return data as Platform
}

export async function deletePlatform(platformId: string): Promise<void> {
  const { error } = await supabase
    .from('platforms')
    .delete()
    .eq('id', platformId)

  if (error) throw error
}

// ============================================
// LOGO UPLOAD
// ============================================

export async function uploadPlatformLogo(
  userId: string,
  platformId: string,
  file: File
): Promise<string> {
  const path = getStoragePath(userId, file.name, platformId)
  const storage = getStorageBucket('platform-logos')

  const { error: uploadError } = await storage.upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (uploadError) throw uploadError

  // Get public URL for logos (they're in a public bucket)
  const { data } = storage.getPublicUrl(path)

  // Update platform with logo URL
  await updatePlatform(platformId, { logo_url: data.publicUrl })

  return data.publicUrl
}

// ============================================
// PLATFORM WITH PROJECTS COUNT
// ============================================

export interface PlatformWithStats extends Platform {
  projects_count: number
}

export async function getPlatformsWithStats(userId: string): Promise<PlatformWithStats[]> {
  const { data: platforms, error: platformsError } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (platformsError) throw platformsError

  // Get project counts for each platform
  const result: PlatformWithStats[] = []
  for (const platform of platforms || []) {
    const { count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('platform_id', platform.id)

    if (countError) throw countError

    result.push({
      ...(platform as Platform),
      projects_count: count || 0,
    })
  }

  return result
}
