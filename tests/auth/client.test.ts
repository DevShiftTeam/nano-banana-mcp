import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppConfig } from '../../src/config.js'
import {
  getAuthState,
  createGenAIClient,
  createSdkAdapter,
} from '../../src/auth/client.js'
import type { StoredCredentials } from '../../src/auth/types.js'

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: 'mock text',
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'mockbase64',
                    mimeType: 'image/png',
                  },
                },
              ],
            },
          },
        ],
      }),
    },
  })),
}))

describe('client', () => {
  let tmpDir: string
  let savedApiKey: string | undefined

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-client-'))
    savedApiKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
  })

  afterEach(async () => {
    if (savedApiKey !== undefined) {
      process.env.GEMINI_API_KEY = savedApiKey
    } else {
      delete process.env.GEMINI_API_KEY
    }
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('getAuthState', () => {
    it('returns none when no credentials exist', async () => {
      const config = createAppConfig({ configDir: tmpDir })
      const state = await getAuthState(config)
      expect(state.isAuthenticated).toBe(false)
      expect(state.method).toBe('none')
    })

    it('returns api-key when env var is set', async () => {
      const config = createAppConfig({ configDir: tmpDir })
      const configWithKey = { ...config, envApiKey: 'test-key' }
      const state = await getAuthState(configWithKey)
      expect(state.isAuthenticated).toBe(true)
      expect(state.method).toBe('api-key')
    })

    it('returns api-key when credentials file has API key', async () => {
      const config = createAppConfig({ configDir: tmpDir })
      const creds: StoredCredentials = {
        type: 'api-key',
        apiKey: 'stored-key',
      }
      await fs.writeFile(config.credentialsPath, JSON.stringify(creds))
      const state = await getAuthState(config)
      expect(state.isAuthenticated).toBe(true)
      expect(state.method).toBe('api-key')
    })

    it('returns oauth with expiry when credentials file has OAuth', async () => {
      const config = createAppConfig({ configDir: tmpDir })
      const expiry = Date.now() + 3600_000
      const creds: StoredCredentials = {
        type: 'oauth',
        tokens: {
          accessToken: 'access',
          refreshToken: 'refresh',
          expiryDate: expiry,
          tokenType: 'Bearer',
        },
      }
      await fs.writeFile(config.credentialsPath, JSON.stringify(creds))
      const state = await getAuthState(config)
      expect(state.isAuthenticated).toBe(true)
      expect(state.method).toBe('oauth')
      expect(state.expiresAt).toBe(expiry)
    })
  })

  describe('createSdkAdapter', () => {
    it('creates adapter that calls SDK', async () => {
      const adapter = createSdkAdapter('test-key')
      const result = await adapter.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        prompt: 'a banana',
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      })
      expect(result.text).toBe('mock text')
      expect(result.image?.data).toBe('mockbase64')
      expect(result.image?.mimeType).toBe('image/png')
    })

    it('passes image data to SDK', async () => {
      const adapter = createSdkAdapter('test-key')
      const result = await adapter.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        prompt: 'edit this',
        image: { data: 'imgdata', mimeType: 'image/png' },
        referenceImages: [{ data: 'refdata', mimeType: 'image/jpeg' }],
      })
      expect(result).toBeDefined()
    })

    it('handles response without image', async () => {
      const { GoogleGenAI } = await import('@google/genai')
      vi.mocked(GoogleGenAI).mockImplementationOnce(
        () =>
          ({
            models: {
              generateContent: vi.fn().mockResolvedValue({
                text: 'text only',
                candidates: [{ content: { parts: [{ text: 'text only' }] } }],
              }),
            },
          }) as unknown as InstanceType<typeof GoogleGenAI>
      )

      const adapter = createSdkAdapter('test-key')
      const result = await adapter.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        prompt: 'test',
      })
      expect(result.text).toBe('text only')
      expect(result.image).toBeUndefined()
    })
  })

  describe('createGenAIClient', () => {
    it('uses env API key when available', async () => {
      const config = createAppConfig({ configDir: tmpDir })
      const configWithKey = { ...config, envApiKey: 'env-key' }
      const client = await createGenAIClient(configWithKey)
      expect(client).toBeDefined()
    })

    it('throws when no credentials found', async () => {
      const config = createAppConfig({ configDir: tmpDir })
      await expect(createGenAIClient(config)).rejects.toThrow(
        'No credentials found'
      )
    })

    it('creates SDK adapter for API key credentials', async () => {
      const config = createAppConfig({ configDir: tmpDir })
      const creds: StoredCredentials = {
        type: 'api-key',
        apiKey: 'file-key',
      }
      await fs.mkdir(path.dirname(config.credentialsPath), { recursive: true })
      await fs.writeFile(config.credentialsPath, JSON.stringify(creds))
      const client = await createGenAIClient(config)
      expect(client).toBeDefined()
    })

    it('creates REST client for OAuth credentials', async () => {
      const config = createAppConfig({ configDir: tmpDir })
      const creds: StoredCredentials = {
        type: 'oauth',
        tokens: {
          accessToken: 'access',
          refreshToken: 'refresh',
          expiryDate: Date.now() + 3600_000,
          tokenType: 'Bearer',
        },
      }
      await fs.mkdir(path.dirname(config.credentialsPath), { recursive: true })
      await fs.writeFile(config.credentialsPath, JSON.stringify(creds))
      const client = await createGenAIClient(config)
      expect(client).toBeDefined()
    })
  })
})
