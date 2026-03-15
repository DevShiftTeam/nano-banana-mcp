import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppConfig } from '../../src/config.js'
import {
  configureAuth,
  getStatus,
  getLastImageInfo,
  getAvailableModels,
} from '../../src/tools/configure.js'
import { clearLastImage, saveImage } from '../../src/images/storage.js'

describe('configure tools', () => {
  let tmpDir: string
  let config: ReturnType<typeof createAppConfig>
  let savedApiKey: string | undefined

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-cfg-'))
    savedApiKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    config = createAppConfig({ configDir: tmpDir, outputDir: tmpDir })
    clearLastImage()
  })

  afterEach(async () => {
    if (savedApiKey !== undefined) {
      process.env.GEMINI_API_KEY = savedApiKey
    } else {
      delete process.env.GEMINI_API_KEY
    }
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('configureAuth', () => {
    it('saves API key and returns success message', async () => {
      const result = await configureAuth({ apiKey: 'test-key-123' }, config)
      expect(result.message).toContain('successfully')

      const saved = await fs.readFile(config.credentialsPath, 'utf-8')
      const parsed = JSON.parse(saved)
      expect(parsed.type).toBe('api-key')
      expect(parsed.apiKey).toBe('test-key-123')
    })
  })

  describe('getStatus', () => {
    it('returns status with no auth', async () => {
      const status = await getStatus(config)
      expect(status.auth.method).toBe('none')
      expect(status.currentModel).toBe('gemini-3.1-flash-image-preview')
      expect(status.outputDir).toBe(tmpDir)
    })

    it('returns status with API key auth', async () => {
      await fs.writeFile(
        config.credentialsPath,
        JSON.stringify({ type: 'api-key', apiKey: 'key-123' })
      )
      const status = await getStatus(config)
      expect(status.auth.isAuthenticated).toBe(true)
      expect(status.auth.method).toBe('api-key')
    })
  })

  describe('getLastImageInfo', () => {
    it('returns null when no image', () => {
      expect(getLastImageInfo()).toBeNull()
    })

    it('returns metadata after image save', async () => {
      const data = Buffer.from('test').toString('base64')
      await saveImage(tmpDir, data, 'image/png')
      const info = getLastImageInfo()
      expect(info).not.toBeNull()
      expect(info!.mimeType).toBe('image/png')
    })
  })

  describe('getAvailableModels', () => {
    it('returns all models', () => {
      const models = getAvailableModels()
      expect(models).toHaveLength(3)
      expect(models.some((m) => m.isDefault)).toBe(true)
    })

    it('returns plain objects (not frozen)', () => {
      const models = getAvailableModels()
      expect(typeof models[0].id).toBe('string')
      expect(typeof models[0].product).toBe('string')
    })
  })
})
