import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  saveImage,
  getLastImage,
  clearLastImage,
  readImageFile,
  validateImagePath,
  createImageHistory,
} from '../../src/images/storage.js'

describe('storage', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-store-'))
    clearLastImage()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('saveImage', () => {
    it('saves base64 image to file', async () => {
      const data = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')
      const metadata = await saveImage(tmpDir, data, 'image/png')

      expect(metadata.filePath).toContain(tmpDir)
      expect(metadata.filePath).toMatch(/\.png$/)
      expect(metadata.mimeType).toBe('image/png')
      expect(metadata.sizeBytes).toBe(4)

      const saved = await fs.readFile(metadata.filePath)
      expect(saved).toEqual(Buffer.from(data, 'base64'))
    })

    it('creates output directory if needed', async () => {
      const nestedDir = path.join(tmpDir, 'sub', 'dir')
      const data = Buffer.from('test').toString('base64')
      const metadata = await saveImage(nestedDir, data, 'image/png')

      expect(metadata.filePath).toContain(nestedDir)
    })

    it('uses custom prefix in filename', async () => {
      const data = Buffer.from('test').toString('base64')
      const metadata = await saveImage(tmpDir, data, 'image/png', 'custom')
      expect(path.basename(metadata.filePath)).toMatch(/^custom-/)
    })

    it('updates last image metadata', async () => {
      const data = Buffer.from('test').toString('base64')
      const metadata = await saveImage(tmpDir, data, 'image/jpeg')
      const last = getLastImage()
      expect(last).toEqual(metadata)
    })
  })

  describe('getLastImage / clearLastImage', () => {
    it('returns null when no image saved', () => {
      expect(getLastImage()).toBeNull()
    })

    it('clears last image', async () => {
      const data = Buffer.from('test').toString('base64')
      await saveImage(tmpDir, data, 'image/png')
      expect(getLastImage()).not.toBeNull()
      clearLastImage()
      expect(getLastImage()).toBeNull()
    })
  })

  describe('validateImagePath', () => {
    it('resolves valid path within allowed dir', () => {
      const result = validateImagePath(
        path.join(tmpDir, 'image.png'),
        [tmpDir]
      )
      expect(result).toBe(path.resolve(tmpDir, 'image.png'))
    })

    it('throws for path outside allowed dir', () => {
      expect(() =>
        validateImagePath('/etc/passwd', [tmpDir])
      ).toThrow('Path not allowed')
    })

    it('throws for path traversal attempt', () => {
      expect(() =>
        validateImagePath(path.join(tmpDir, '..', '..', 'etc', 'passwd'), [tmpDir])
      ).toThrow('Path not allowed')
    })

    it('allows any path when no allowed dirs specified', () => {
      const result = validateImagePath('/any/path/image.png')
      expect(result).toBe(path.resolve('/any/path/image.png'))
    })
  })

  describe('createImageHistory', () => {
    it('starts with null', () => {
      const history = createImageHistory()
      expect(history.getLast()).toBeNull()
    })

    it('tracks last image', () => {
      const history = createImageHistory()
      const metadata = {
        filePath: '/test.png',
        mimeType: 'image/png',
        timestamp: Date.now(),
        sizeBytes: 100,
      }
      history.setLast(metadata)
      expect(history.getLast()).toEqual(metadata)
    })

    it('clears tracked image', () => {
      const history = createImageHistory()
      history.setLast({
        filePath: '/test.png',
        mimeType: 'image/png',
        timestamp: Date.now(),
        sizeBytes: 100,
      })
      history.clear()
      expect(history.getLast()).toBeNull()
    })
  })

  describe('readImageFile', () => {
    it('reads existing image file', async () => {
      const filePath = path.join(tmpDir, 'test.png')
      const content = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      await fs.writeFile(filePath, content)

      const result = await readImageFile(filePath)
      expect(result.mimeType).toBe('image/png')
      expect(result.data).toBe(content.toString('base64'))
    })

    it('throws for nonexistent file', async () => {
      await expect(
        readImageFile(path.join(tmpDir, 'nope.png'))
      ).rejects.toThrow('Image file not found')
    })
  })
})
