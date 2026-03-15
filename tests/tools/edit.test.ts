import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppConfig } from '../../src/config.js'
import type { GenAIAdapter, GenerateContentRequest } from '../../src/auth/types.js'
import { editImage } from '../../src/tools/edit.js'

function createMockClient(): GenAIAdapter {
  return {
    generateContent: async (req: GenerateContentRequest) => ({
      text: 'Edited image',
      image: {
        data: Buffer.from('edited-png').toString('base64'),
        mimeType: 'image/png',
      },
    }),
  }
}

describe('edit tool', () => {
  let tmpDir: string
  let config: ReturnType<typeof createAppConfig>
  let sourceImagePath: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-edit-'))
    config = createAppConfig({ outputDir: tmpDir })

    sourceImagePath = path.join(tmpDir, 'source.png')
    await fs.writeFile(sourceImagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('edits image and saves result', async () => {
    const client = createMockClient()
    const result = await editImage(
      { prompt: 'make it yellow', imagePath: sourceImagePath },
      client,
      config
    )

    expect(result.filePath).toContain(tmpDir)
    expect(result.model).toBe('gemini-3.1-flash-image-preview')
    expect(result.sizeBytes).toBeGreaterThan(0)
  })

  it('throws for nonexistent source image', async () => {
    const client = createMockClient()
    await expect(
      editImage(
        { prompt: 'edit', imagePath: '/nonexistent/path.png' },
        client,
        config
      )
    ).rejects.toThrow('Image file not found')
  })

  it('supports reference images', async () => {
    const refPath = path.join(tmpDir, 'ref.jpg')
    await fs.writeFile(refPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]))

    const requests: GenerateContentRequest[] = []
    const client: GenAIAdapter = {
      generateContent: async (req) => {
        requests.push(req)
        return {
          image: {
            data: Buffer.from('edited').toString('base64'),
            mimeType: 'image/png',
          },
        }
      },
    }

    await editImage(
      {
        prompt: 'use reference style',
        imagePath: sourceImagePath,
        referenceImages: [refPath],
      },
      client,
      config
    )

    expect(requests[0].referenceImages).toHaveLength(1)
  })
})
