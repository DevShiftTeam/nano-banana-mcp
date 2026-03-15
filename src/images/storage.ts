import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { ensureDir } from '../config.js'
import { decodeBase64ToBuffer, getExtensionFromMime } from './encoding.js'

export interface ImageMetadata {
  readonly filePath: string
  readonly mimeType: string
  readonly timestamp: number
  readonly sizeBytes: number
}

export interface ImageHistory {
  getLast(): ImageMetadata | null
  setLast(metadata: ImageMetadata): void
  clear(): void
}

export function createImageHistory(): ImageHistory {
  let last: ImageMetadata | null = null
  return {
    getLast: () => last,
    setLast: (metadata: ImageMetadata) => {
      last = metadata
    },
    clear: () => {
      last = null
    },
  }
}

const defaultHistory = createImageHistory()

export function getLastImage(): ImageMetadata | null {
  return defaultHistory.getLast()
}

export function setLastImage(metadata: ImageMetadata): void {
  defaultHistory.setLast(metadata)
}

export function clearLastImage(): void {
  defaultHistory.clear()
}

function generateFilename(mimeType: string, prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const ext = getExtensionFromMime(mimeType)
  return `${prefix}-${timestamp}${ext}`
}

export function validateImagePath(
  filePath: string,
  allowedDirs?: readonly string[]
): string {
  const resolved = path.resolve(filePath)

  if (allowedDirs && allowedDirs.length > 0) {
    const isAllowed = allowedDirs.some((dir) => {
      const resolvedDir = path.resolve(dir)
      return (
        resolved.startsWith(resolvedDir + path.sep) ||
        resolved === resolvedDir
      )
    })
    if (!isAllowed) {
      throw new Error(
        `Path not allowed: ${filePath}. Must be within: ${allowedDirs.join(', ')}`
      )
    }
  }

  return resolved
}

export async function saveImage(
  outputDir: string,
  base64Data: string,
  mimeType: string,
  prefix: string = 'nano-banana'
): Promise<ImageMetadata> {
  await ensureDir(outputDir)

  const filename = generateFilename(mimeType, prefix)
  const filePath = path.join(outputDir, filename)
  const buffer = decodeBase64ToBuffer(base64Data)

  await fs.writeFile(filePath, buffer)

  const metadata: ImageMetadata = {
    filePath,
    mimeType,
    timestamp: Date.now(),
    sizeBytes: buffer.length,
  }

  setLastImage(metadata)

  return metadata
}

export async function readImageFile(
  filePath: string
): Promise<{ data: string; mimeType: string }> {
  const resolved = path.resolve(filePath)

  try {
    await fs.access(resolved)
  } catch {
    throw new Error(`Image file not found: ${filePath}`)
  }

  const { getMimeType, encodeImageToBase64 } = await import('./encoding.js')
  const mimeType = getMimeType(resolved)
  const data = await encodeImageToBase64(resolved)

  return { data, mimeType }
}
