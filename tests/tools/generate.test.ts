import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppConfig } from '../../src/config.js'
import type { GenAIAdapter, GenerateContentRequest } from '../../src/auth/types.js'
import { generateImage } from '../../src/tools/generate.js'
import { clearLastImage, getLastImage } from '../../src/images/storage.js'

function createMockClient(
  imageData: string = Buffer.from('fake-png').toString('base64')
): GenAIAdapter {
  return {
    generateContent: async (_req: GenerateContentRequest) => ({
      text: 'Generated image',
      image: {
        data: imageData,
        mimeType: 'image/png',
      },
    }),
  }
}

function createTextOnlyClient(): GenAIAdapter {
  return {
    generateContent: async () => ({
      text: 'Sorry, I cannot generate that image.',
    }),
  }
}

describe('generate tool', () => {
  let tmpDir: string
  let config: ReturnType<typeof createAppConfig>

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-gen-'))
    config = createAppConfig({ outputDir: tmpDir })
    clearLastImage()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('generates image and saves to disk', async () => {
    const client = createMockClient()
    const result = await generateImage(
      { prompt: 'a banana', aspectRatio: '1:1' },
      client,
      config
    )

    expect(result.filePath).toContain(tmpDir)
    expect(result.model).toBe('gemini-3.1-flash-image-preview')
    expect(result.sizeBytes).toBeGreaterThan(0)

    const stat = await fs.stat(result.filePath)
    expect(stat.isFile()).toBe(true)
  })

  it('uses specified model', async () => {
    const client = createMockClient()
    const result = await generateImage(
      { prompt: 'test', model: 'gemini-3-pro-image-preview', aspectRatio: '1:1' },
      client,
      config
    )
    expect(result.model).toBe('gemini-3-pro-image-preview')
  })

  it('updates last image tracker', async () => {
    const client = createMockClient()
    await generateImage(
      { prompt: 'test', aspectRatio: '1:1' },
      client,
      config
    )
    const last = getLastImage()
    expect(last).not.toBeNull()
    expect(last!.mimeType).toBe('image/png')
  })

  it('throws when no image returned', async () => {
    const client = createTextOnlyClient()
    await expect(
      generateImage({ prompt: 'test', aspectRatio: '1:1' }, client, config)
    ).rejects.toThrow('no image')
  })

  it('throws for invalid model', async () => {
    const client = createMockClient()
    await expect(
      generateImage(
        { prompt: 'test', model: 'bad-model', aspectRatio: '1:1' },
        client,
        config
      )
    ).rejects.toThrow('Unknown model')
  })
})
