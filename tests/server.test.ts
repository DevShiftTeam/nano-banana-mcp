import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppConfig } from '../src/config.js'
import { createServer } from '../src/server.js'

vi.mock('../src/auth/client.js', () => ({
  createGenAIClient: vi.fn().mockResolvedValue({
    generateContent: vi.fn().mockResolvedValue({
      text: 'Generated',
      image: {
        data: Buffer.from('test-image').toString('base64'),
        mimeType: 'image/png',
      },
    }),
  }),
  getAuthState: vi.fn().mockResolvedValue({
    isAuthenticated: true,
    method: 'api-key',
  }),
}))

describe('server', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-srv-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('creates MCP server instance', () => {
    const config = createAppConfig({ configDir: tmpDir, outputDir: tmpDir })
    const server = createServer(config)
    expect(server).toBeDefined()
  })
})
