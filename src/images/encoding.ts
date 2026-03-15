import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeType = MIME_TYPES[ext]
  if (!mimeType) {
    throw new Error(
      `Unsupported image format: ${ext}. Supported: ${Object.keys(MIME_TYPES).join(', ')}`
    )
  }
  return mimeType
}

export function getExtensionFromMime(mimeType: string): string {
  const entry = Object.entries(MIME_TYPES).find(
    ([, mime]) => mime === mimeType
  )
  return entry?.[0] ?? '.png'
}

export async function encodeImageToBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  return buffer.toString('base64')
}

export function decodeBase64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64')
}
