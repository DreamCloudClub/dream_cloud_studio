import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// Create untyped client - we'll handle types in the service layer
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Helper to get storage bucket
export const getStorageBucket = (bucket: 'avatars' | 'platform-logos' | 'project-assets' | 'mood-board-images' | 'generated-media' | 'exports') => {
  return supabase.storage.from(bucket)
}

// Helper to generate storage path with user ID prefix
export const getStoragePath = (userId: string, filename: string, subfolder?: string) => {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const path = subfolder
    ? `${userId}/${subfolder}/${timestamp}-${sanitizedFilename}`
    : `${userId}/${timestamp}-${sanitizedFilename}`
  return path
}

// Helper to get public URL for a file
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Helper to get signed URL for private files
export const getSignedUrl = async (bucket: string, path: string, expiresIn = 3600) => {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}
