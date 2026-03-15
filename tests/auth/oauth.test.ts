import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppConfig } from '../../src/config.js'
import {
  generateAuthUrl,
  startCallbackServer,
  exchangeCodeForTokens,
  refreshAccessToken,
  ensureValidTokens,
} from '../../src/auth/oauth.js'
import type { StoredCredentials } from '../../src/auth/types.js'

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      generateAuthUrl: vi
        .fn()
        .mockReturnValue(
          'https://accounts.google.com/o/oauth2/auth?mock=true'
        ),
      getToken: vi.fn().mockResolvedValue({
        tokens: {
          access_token: 'mock-access',
          refresh_token: 'mock-refresh',
          expiry_date: Date.now() + 3600_000,
          token_type: 'Bearer',
        },
      }),
      refreshAccessToken: vi.fn().mockResolvedValue({
        credentials: {
          access_token: 'refreshed-access',
          refresh_token: 'mock-refresh',
          expiry_date: Date.now() + 3600_000,
          token_type: 'Bearer',
        },
      }),
      setCredentials: vi.fn(),
    })),
  }
})

describe('oauth', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-oauth-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  const config = createAppConfig({
    configDir: '/tmp/test-nb',
  })

  describe('generateAuthUrl', () => {
    it('returns a Google auth URL', () => {
      const url = generateAuthUrl(config)
      expect(url).toContain('accounts.google.com')
    })
  })

  describe('startCallbackServer', () => {
    it('resolves with code on successful callback', async () => {
      const port = 19876 + Math.floor(Math.random() * 1000)
      const serverPromise = startCallbackServer(port)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch(
        `http://127.0.0.1:${port}/oauth/callback?code=test-code-123`
      )
      expect(response.ok).toBe(true)

      const result = await serverPromise
      expect(result.code).toBe('test-code-123')
    })

    it('rejects on OAuth error', async () => {
      const port = 19876 + Math.floor(Math.random() * 1000)
      const serverPromise = startCallbackServer(port)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const resultPromise = serverPromise.catch((e) => e)

      await fetch(
        `http://127.0.0.1:${port}/oauth/callback?error=access_denied`
      )

      const error = await resultPromise
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('access_denied')
    })

    it('returns 404 for unknown paths', async () => {
      const port = 19876 + Math.floor(Math.random() * 1000)
      const serverPromise = startCallbackServer(port)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch(`http://127.0.0.1:${port}/unknown`)
      expect(response.status).toBe(404)

      // Clean up: send valid callback to resolve promise
      await fetch(
        `http://127.0.0.1:${port}/oauth/callback?code=cleanup`
      )
      await serverPromise
    })

    it('rejects when no code provided', async () => {
      const port = 19876 + Math.floor(Math.random() * 1000)
      const serverPromise = startCallbackServer(port)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const resultPromise = serverPromise.catch((e) => e)

      await fetch(`http://127.0.0.1:${port}/oauth/callback`)

      const error = await resultPromise
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('No authorization code')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('exchanges code and returns tokens', async () => {
      const tokens = await exchangeCodeForTokens(config, 'auth-code-123')
      expect(tokens.accessToken).toBe('mock-access')
      expect(tokens.refreshToken).toBe('mock-refresh')
      expect(tokens.tokenType).toBe('Bearer')
      expect(tokens.expiryDate).toBeGreaterThan(Date.now())
    })
  })

  describe('refreshAccessToken', () => {
    it('refreshes and returns new tokens', async () => {
      const tokens = await refreshAccessToken(config, 'old-refresh-token')
      expect(tokens.accessToken).toBe('refreshed-access')
      expect(tokens.refreshToken).toBe('mock-refresh')
    })
  })

  describe('ensureValidTokens', () => {
    it('throws when no OAuth credentials exist', async () => {
      const localConfig = createAppConfig({ configDir: tmpDir })
      await expect(ensureValidTokens(localConfig)).rejects.toThrow(
        'No OAuth credentials'
      )
    })

    it('returns existing tokens when not expired', async () => {
      const localConfig = createAppConfig({ configDir: tmpDir })
      const creds: StoredCredentials = {
        type: 'oauth',
        tokens: {
          accessToken: 'valid-access',
          refreshToken: 'valid-refresh',
          expiryDate: Date.now() + 3600_000,
          tokenType: 'Bearer',
        },
      }
      await fs.mkdir(path.dirname(localConfig.credentialsPath), {
        recursive: true,
      })
      await fs.writeFile(
        localConfig.credentialsPath,
        JSON.stringify(creds)
      )

      const tokens = await ensureValidTokens(localConfig)
      expect(tokens.accessToken).toBe('valid-access')
    })

    it('refreshes tokens when expired', async () => {
      const localConfig = createAppConfig({ configDir: tmpDir })
      const creds: StoredCredentials = {
        type: 'oauth',
        tokens: {
          accessToken: 'expired-access',
          refreshToken: 'valid-refresh',
          expiryDate: Date.now() - 1000,
          tokenType: 'Bearer',
        },
      }
      await fs.mkdir(path.dirname(localConfig.credentialsPath), {
        recursive: true,
      })
      await fs.writeFile(
        localConfig.credentialsPath,
        JSON.stringify(creds)
      )

      const tokens = await ensureValidTokens(localConfig)
      expect(tokens.accessToken).toBe('refreshed-access')
    })

    it('throws when credentials are api-key type', async () => {
      const localConfig = createAppConfig({ configDir: tmpDir })
      const creds: StoredCredentials = {
        type: 'api-key',
        apiKey: 'some-key',
      }
      await fs.mkdir(path.dirname(localConfig.credentialsPath), {
        recursive: true,
      })
      await fs.writeFile(
        localConfig.credentialsPath,
        JSON.stringify(creds)
      )

      await expect(ensureValidTokens(localConfig)).rejects.toThrow(
        'No OAuth credentials'
      )
    })
  })
})
