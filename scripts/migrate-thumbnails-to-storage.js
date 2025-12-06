#!/usr/bin/env node
/**
 * scripts/migrate-thumbnails-to-storage.js
 *
 * Migrate base64 `data:` thumbnails stored in `public.bookmarks.custom_thumbnail`
 * into a Supabase Storage bucket and update the bookmark rows to reference
 * the uploaded public URL instead of storing the base64 blob in the DB.
 *
 * WARNING: This script requires a SUPABASE_SERVICE_ROLE_KEY (admin key).
 * Run locally with a service role key and be cautious — test with --dry-run first.
 *
 * Usage:
 *   npm install @supabase/supabase-js
 *   SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=ey... node scripts/migrate-thumbnails-to-storage.js --bucket bookmarks-thumbnails --dry-run
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const argv = process.argv.slice(2)
const opts = {
  bucket: 'bookmarks-thumbnails',
  dryRun: false,
}

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--bucket' && argv[i+1]) { opts.bucket = argv[++i] }
  if (a === '--dry-run') opts.dryRun = true
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  // use a longer timeout for big uploads
  global: { fetch: globalThis.fetch }
})

function parseDataUrl(dataUrl) {
  // data:[<mediatype>][;base64],<data>
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  if (!match) return null
  return { mime: match[1], base64: match[2] }
}

function extFromMime(mime) {
  const m = mime.split('/')
  return m[1] ? m[1].split('+')[0] : 'bin'
}

async function ensureBucket(bucket) {
  try {
    // attempt create (will error if already exists but we catch)
    const { error: createErr } = await supabase.storage.createBucket(bucket, { public: true })
    if (createErr) {
      // some projects may not allow createBucket via service role; ignore if already exists
      // We'll still proceed and assume bucket exists or user will create manually
      // Log but continue
      console.warn('createBucket warning:', createErr.message || createErr)
    }
  } catch (err) {
    console.warn('Could not auto-create bucket (continuing):', err?.message || err)
  }
}

async function migrate() {
  console.log('Starting thumbnail migration (dryRun=%s) to bucket: %s', opts.dryRun, opts.bucket)

  // fetch bookmarks with a non-null custom_thumbnail
  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select('id, user_id, custom_thumbnail')
    .not('custom_thumbnail', 'is', null)
    .limit(1000)

  if (error) {
    console.error('Failed to fetch bookmarks:', error)
    process.exit(1)
  }

  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    console.log('No bookmarks with custom_thumbnail found. Nothing to do.')
    return
  }

  console.log('Found', bookmarks.length, 'bookmarks with custom_thumbnail')

  if (!opts.dryRun) {
    await ensureBucket(opts.bucket)
  }

  for (const b of bookmarks) {
    const id = b.id
    const userId = b.user_id
    const val = b.custom_thumbnail
    if (!val || typeof val !== 'string') continue

    const parsed = parseDataUrl(val)
    if (!parsed) {
      console.log(`Skipping ${id} (not a data URL or already a URL)`)
      continue
    }

    const mime = parsed.mime
    const ext = extFromMime(mime)
    const fileName = `${id}.${ext}`
    const filePath = `${userId}/${fileName}`
    const buffer = Buffer.from(parsed.base64, 'base64')

    console.log(`Processing bookmark ${id} (user=${userId}) → ${filePath} (${buffer.length} bytes, mime=${mime})`)

    if (opts.dryRun) continue

    try {
      const { error: uploadErr } = await supabase.storage.from(opts.bucket).upload(filePath, buffer, {
        contentType: mime,
        upsert: true
      })
      if (uploadErr) {
        console.error('Upload failed for', id, uploadErr)
        continue
      }

      // obtain public URL
      const { data: publicData } = supabase.storage.from(opts.bucket).getPublicUrl(filePath)
      const publicUrl = publicData?.publicUrl || null

      if (!publicUrl) {
        console.warn('Could not obtain public URL for', filePath)
        continue
      }

      // update bookmark row
      const { error: updateErr } = await supabase
        .from('bookmarks')
        .update({ custom_thumbnail: publicUrl })
        .eq('id', id)

      if (updateErr) {
        console.error('Failed to update bookmark row for', id, updateErr)
        continue
      }

      console.log('Migrated', id, '→', publicUrl)
    } catch (err) {
      console.error('Unexpected error migrating', id, err?.message || err)
    }
  }

  console.log('Migration complete.')
}

migrate().catch(err => {
  console.error('Migration failed', err)
  process.exit(1)
})
