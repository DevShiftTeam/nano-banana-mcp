import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppConfig } from '../../src/config.js'
import { createRestClient } from '../../src/auth/rest-client.js'
import type { StoredCredentials } from '../../src/auth/types.js'

describe('rest-client', () => {
  let tmpDir: string
  let originalFetch: typeof globalThis.fetch

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-rest-'))
    originalFetch = globalThis.fetch
  })

  afterEach(async () => {
    globalThis.fetch = originalFetch
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  function setupCredentials(expiryDate: number = Date.now() + 3600_000) {
    const config = createAppConfig({ configDir: tmpDir })
    const creds: StoredCredentials = {
      type: 'oauth',
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate,
        tokenType: 'Bearer',
      },
    }
    return { config, creds }
  }

  it('sends request with Bearer token and returns parsed response', async () => {
    const { config, creds } = setupCredentials()
    await fs.mkdir(path.dirname(config.credentialsPath), { recursive: true })
    await fs.writeFile(config.credentialsPath, JSON.stringify(creds))

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'Image description' },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: 'base64imagedata',
                },
              },
            ],
          },
        },
      ],
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const client = createRestClient(config)
    const result = await client.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      prompt: 'a banana',
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    })

    expect(result.text).toBe('Image description')
    expect(result.image?.data).toBe('base64imagedata')
    expect(result.image?.mimeType).toBe('image/png')

    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(fetchCall[0]).toContain('gemini-3.1-flash-image-preview')
    const headers = (fetchCall[1] as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer test-access-token')
  })

  it('sends image data in request', async () => {
    const { config, creds } = setupCredentials()
    await fs.mkdir(path.dirname(config.credentialsPath), { recursive: true })
    await fs.writeFile(config.credentialsPath, JSON.stringify(creds))

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            { content: { parts: [{ text: 'edited' }] } },
          ],
        }),
    })

    const client = createRestClient(config)
    await client.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      prompt: 'edit this',
      image: { data: 'imagebase64', mimeType: 'image/png' },
      referenceImages: [{ data: 'refbase64', mimeType: 'image/jpeg' }],
    })

    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0]
    const body = JSON.parse((fetchCall[1] as RequestInit).body as string)
    const parts = body.contents[0].parts
    expect(parts).toHaveLength(3)
    expect(parts[0].inlineData.data).toBe('imagebase64')
    expect(parts[1].inlineData.data).toBe('refbase64')
    expect(parts[2].text).toBe('edit this')
  })

  it('throws on API error response', async () => {
    const { config, creds } = setupCredentials()
    await fs.mkdir(path.dirname(config.credentialsPath), { recursive: true })
    await fs.writeFile(config.credentialsPath, JSON.stringify(creds))

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    })

    const client = createRestClient(config)
    await expect(
      client.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        prompt: 'test',
      })
    ).rejects.toThrow('Gemini API error (403)')
  })

  it('throws when no candidates returned', async () => {
    const { config, creds } = setupCredentials()
    await fs.mkdir(path.dirname(config.credentialsPath), { recursive: true })
    await fs.writeFile(config.credentialsPath, JSON.stringify(creds))

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    })

    const client = createRestClient(config)
    await expect(
      client.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        prompt: 'test',
      })
    ).rejects.toThrow('No response candidate')
  })
})
