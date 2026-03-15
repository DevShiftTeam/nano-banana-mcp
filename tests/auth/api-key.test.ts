import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  createApiKeyCredentials,
  saveApiKey,
  validateApiKey,
} from '../../src/auth/api-key.js'

describe('api-key', () => {
  describe('createApiKeyCredentials', () => {
    it('creates credentials from valid key', () => {
      const creds = createApiKeyCredentials('test-key-123')
      expect(creds.type).toBe('api-key')
      expect(creds.apiKey).toBe('test-key-123')
    })

    it('trims whitespace', () => {
      const creds = createApiKeyCredentials('  key-456  ')
      expect(creds.apiKey).toBe('key-456')
    })

    it('throws for empty key', () => {
      expect(() => createApiKeyCredentials('')).toThrow('cannot be empty')
    })

    it('throws for whitespace-only key', () => {
      expect(() => createApiKeyCredentials('   ')).toThrow('cannot be empty')
    })
  })

  describe('saveApiKey', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-apikey-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('saves API key to credentials file', async () => {
      const credPath = path.join(tmpDir, 'credentials.json')
      await saveApiKey(credPath, 'save-test-key')

      const raw = await fs.readFile(credPath, 'utf-8')
      const parsed = JSON.parse(raw)
      expect(parsed.type).toBe('api-key')
      expect(parsed.apiKey).toBe('save-test-key')
    })
  })

  describe('validateApiKey', () => {
    it('returns false when fetch fails', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'))

      const result = await validateApiKey('bad-key')
      expect(result).toBe(false)

      globalThis.fetch = originalFetch
    })

    it('returns true for successful response', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

      const result = await validateApiKey('good-key')
      expect(result).toBe(true)

      globalThis.fetch = originalFetch
    })

    it('returns false for non-ok response', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

      const result = await validateApiKey('invalid-key')
      expect(result).toBe(false)

      globalThis.fetch = originalFetch
    })
  })
})
