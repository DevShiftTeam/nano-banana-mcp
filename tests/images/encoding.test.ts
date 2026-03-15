import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  getMimeType,
  getExtensionFromMime,
  encodeImageToBase64,
  decodeBase64ToBuffer,
} from '../../src/images/encoding.js'

describe('encoding', () => {
  describe('getMimeType', () => {
    it('returns correct MIME for png', () => {
      expect(getMimeType('image.png')).toBe('image/png')
    })

    it('returns correct MIME for jpg', () => {
      expect(getMimeType('photo.jpg')).toBe('image/jpeg')
    })

    it('returns correct MIME for jpeg', () => {
      expect(getMimeType('photo.jpeg')).toBe('image/jpeg')
    })

    it('returns correct MIME for webp', () => {
      expect(getMimeType('image.webp')).toBe('image/webp')
    })

    it('returns correct MIME for gif', () => {
      expect(getMimeType('anim.gif')).toBe('image/gif')
    })

    it('throws for unsupported format', () => {
      expect(() => getMimeType('file.tiff')).toThrow('Unsupported image format')
    })

    it('handles case-insensitive extensions', () => {
      expect(getMimeType('IMAGE.PNG')).toBe('image/png')
    })
  })

  describe('getExtensionFromMime', () => {
    it('returns .png for image/png', () => {
      expect(getExtensionFromMime('image/png')).toBe('.png')
    })

    it('returns .jpg for image/jpeg', () => {
      expect(getExtensionFromMime('image/jpeg')).toBe('.jpg')
    })

    it('defaults to .png for unknown', () => {
      expect(getExtensionFromMime('image/unknown')).toBe('.png')
    })
  })

  describe('encodeImageToBase64', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-enc-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('encodes file to base64', async () => {
      const filePath = path.join(tmpDir, 'test.png')
      const content = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      await fs.writeFile(filePath, content)
      const encoded = await encodeImageToBase64(filePath)
      expect(encoded).toBe(content.toString('base64'))
    })
  })

  describe('decodeBase64ToBuffer', () => {
    it('decodes base64 to buffer', () => {
      const original = Buffer.from('hello world')
      const base64 = original.toString('base64')
      const decoded = decodeBase64ToBuffer(base64)
      expect(decoded).toEqual(original)
    })
  })
})
