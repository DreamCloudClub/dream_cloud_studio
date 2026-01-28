/**
 * Migration script: Convert base64 data URLs to Supabase Storage
 *
 * Run this script to migrate existing base64-encoded assets to Supabase Storage.
 * This gives you permanent public URLs instead of large base64 strings in the database.
 *
 * Prerequisites:
 * 1. Make the 'generated-media' bucket public in Supabase Dashboard:
 *    - Go to Storage > generated-media > Settings
 *    - Toggle "Public bucket" ON
 *
 * 2. Or run this SQL in the Supabase SQL Editor:
 *    UPDATE storage.buckets SET public = true WHERE id = 'generated-media';
 *
 * Usage:
 *   npx tsx scripts/migrate-base64-to-storage.ts
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role for migration

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  console.error('  VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'MISSING')
  console.error('')
  console.error('Set SUPABASE_SERVICE_ROLE_KEY in your environment (not .env for security)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Asset {
  id: string
  user_id: string
  url: string | null
  type: string
}

function isBase64DataUrl(url: string | null): boolean {
  return url?.startsWith('data:') ?? false
}

function getExtensionFromMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  if (!match) return 'bin'

  const mime = match[1]
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  }

  return mimeMap[mime] || 'bin'
}

function base64ToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/^data:([^;]+)/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type: mimeType })
}

async function migrateAsset(asset: Asset): Promise<{ success: boolean; error?: string }> {
  if (!asset.url || !isBase64DataUrl(asset.url)) {
    return { success: true } // Nothing to migrate
  }

  try {
    const blob = base64ToBlob(asset.url)
    const extension = getExtensionFromMimeType(asset.url)
    const storagePath = `${asset.user_id}/${asset.id}.${extension}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('generated-media')
      .upload(storagePath, blob, {
        cacheControl: '31536000',
        contentType: blob.type,
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated-media')
      .getPublicUrl(storagePath)

    // Update database record
    const { error: updateError } = await supabase
      .from('assets')
      .update({ url: urlData.publicUrl })
      .eq('id', asset.id)

    if (updateError) {
      return { success: false, error: `DB update failed: ${updateError.message}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

async function main() {
  console.log('🚀 Starting base64 to Supabase Storage migration...\n')

  // Fetch all assets with base64 URLs
  const { data: assets, error: fetchError } = await supabase
    .from('assets')
    .select('id, user_id, url, type')
    .like('url', 'data:%')

  if (fetchError) {
    console.error('❌ Failed to fetch assets:', fetchError.message)
    process.exit(1)
  }

  if (!assets || assets.length === 0) {
    console.log('✅ No base64 assets found. Nothing to migrate.')
    return
  }

  console.log(`📦 Found ${assets.length} base64 assets to migrate\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    const progress = `[${i + 1}/${assets.length}]`

    process.stdout.write(`${progress} Migrating ${asset.id} (${asset.type})... `)

    const result = await migrateAsset(asset)

    if (result.success) {
      console.log('✅')
      successCount++
    } else {
      console.log(`❌ ${result.error}`)
      errorCount++
    }
  }

  console.log('\n📊 Migration complete!')
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
}

main().catch(console.error)
