import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppConfig } from '../../src/config.js'
import type { GenAIAdapter } from '../../src/auth/types.js'
import { continueEditing } from '../../src/tools/continue.js'
import { clearLastImage, saveImage } from '../../src/images/storage.js'

function createMockClient(): GenAIAdapter {
  return {
    generateContent: async () => ({
      text: 'Continued',
      image: {
        data: Buffer.from('continued-png').toString('base64'),
        mimeType: 'image/png',
      },
    }),
  }
}

describe('continue tool', () => {
  let tmpDir: string
  let config: ReturnType<typeof createAppConfig>

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-cont-'))
    config = createAppConfig({ outputDir: tmpDir })
    clearLastImage()
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('throws when no previous image exists', async () => {
    const client = createMockClient()
    await expect(
      continueEditing({ prompt: 'refine' }, client, config)
    ).rejects.toThrow('No previous image')
  })

  it('continues editing last image', async () => {
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')
    await saveImage(tmpDir, data, 'image/png', 'source')

    const client = createMockClient()
    const result = await continueEditing(
      { prompt: 'make it brighter' },
      client,
      config
    )

    expect(result.filePath).toContain(tmpDir)
    expect(result.model).toBe('gemini-3.1-flash-image-preview')
    expect(result.sizeBytes).toBeGreaterThan(0)
  })

  it('uses specified model', async () => {
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')
    await saveImage(tmpDir, data, 'image/png', 'source')

    const client = createMockClient()
    const result = await continueEditing(
      { prompt: 'refine', model: 'gemini-3-pro-image-preview' },
      client,
      config
    )
    expect(result.model).toBe('gemini-3-pro-image-preview')
  })
})
