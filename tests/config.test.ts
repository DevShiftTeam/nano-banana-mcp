import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  createAppConfig,
  loadUserConfig,
  saveUserConfig,
  ensureDir,
} from '../src/config.js'

describe('config', () => {
  describe('createAppConfig', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('uses default paths', () => {
      const config = createAppConfig()
      expect(config.configDir).toBe(
        path.join(os.homedir(), '.nano-banana')
      )
      expect(config.outputDir).toBe(
        path.join(os.homedir(), 'nano-banana-images')
      )
    })

    it('respects env variable overrides', () => {
      process.env.NANO_BANANA_CONFIG_DIR = '/tmp/test-config'
      process.env.NANO_BANANA_OUTPUT_DIR = '/tmp/test-output'

      const config = createAppConfig()
      expect(config.configDir).toBe('/tmp/test-config')
      expect(config.outputDir).toBe('/tmp/test-output')
    })

    it('respects direct overrides', () => {
      const config = createAppConfig({
        configDir: '/custom/config',
        outputDir: '/custom/output',
      })
      expect(config.configDir).toBe('/custom/config')
      expect(config.outputDir).toBe('/custom/output')
    })

    it('picks up env API key', () => {
      process.env.GEMINI_API_KEY = 'test-key'
      const config = createAppConfig()
      expect(config.envApiKey).toBe('test-key')
    })

    it('sets constant fields', () => {
      const config = createAppConfig()
      expect(config.oauthCallbackPort).toBe(9876)
      expect(config.tokenExpiryBufferMs).toBe(300_000)
      expect(config.geminiApiBase).toContain('generativelanguage.googleapis.com')
    })
  })

  describe('loadUserConfig', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-test-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('returns defaults when file does not exist', async () => {
      const config = await loadUserConfig(
        path.join(tmpDir, 'nonexistent.json')
      )
      expect(config.authMethod).toBe('oauth')
    })

    it('parses valid config', async () => {
      const configPath = path.join(tmpDir, 'config.json')
      await fs.writeFile(
        configPath,
        JSON.stringify({
          authMethod: 'api-key',
          outputDir: '/custom/path',
        })
      )
      const config = await loadUserConfig(configPath)
      expect(config.authMethod).toBe('api-key')
      expect(config.outputDir).toBe('/custom/path')
    })
  })

  describe('saveUserConfig', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-test-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('saves and can be loaded back', async () => {
      const configPath = path.join(tmpDir, 'sub', 'config.json')
      await saveUserConfig(configPath, {
        authMethod: 'api-key',
        outputDir: '/test/dir',
      })
      const loaded = await loadUserConfig(configPath)
      expect(loaded.authMethod).toBe('api-key')
      expect(loaded.outputDir).toBe('/test/dir')
    })
  })

  describe('ensureDir', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-test-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('creates nested directories', async () => {
      const nested = path.join(tmpDir, 'a', 'b', 'c')
      await ensureDir(nested)
      const stat = await fs.stat(nested)
      expect(stat.isDirectory()).toBe(true)
    })
  })
})
