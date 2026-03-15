import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  readCredentials,
  writeCredentials,
  clearCredentials,
} from '../../src/auth/token-store.js'
import type { StoredCredentials } from '../../src/auth/types.js'

describe('token-store', () => {
  let tmpDir: string
  let credPath: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nb-token-'))
    credPath = path.join(tmpDir, 'credentials.json')
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('readCredentials', () => {
    it('returns null when file does not exist', async () => {
      const result = await readCredentials(credPath)
      expect(result).toBeNull()
    })

    it('throws for invalid JSON', async () => {
      await fs.writeFile(credPath, 'not json')
      await expect(readCredentials(credPath)).rejects.toThrow(
        'Invalid credentials file'
      )
    })

    it('throws for invalid schema', async () => {
      await fs.writeFile(credPath, JSON.stringify({ type: 'unknown' }))
      await expect(readCredentials(credPath)).rejects.toThrow(
        'Invalid credentials file'
      )
    })

    it('reads valid API key credentials', async () => {
      const creds: StoredCredentials = {
        type: 'api-key',
        apiKey: 'test-key-123',
      }
      await fs.writeFile(credPath, JSON.stringify(creds))
      const result = await readCredentials(credPath)
      expect(result).toEqual(creds)
    })

    it('reads valid OAuth credentials', async () => {
      const creds: StoredCredentials = {
        type: 'oauth',
        tokens: {
          accessToken: 'access-123',
          refreshToken: 'refresh-456',
          expiryDate: Date.now() + 3600_000,
          tokenType: 'Bearer',
        },
      }
      await fs.writeFile(credPath, JSON.stringify(creds))
      const result = await readCredentials(credPath)
      expect(result).toEqual(creds)
    })
  })

  describe('writeCredentials', () => {
    it('creates directory and writes file', async () => {
      const nestedPath = path.join(tmpDir, 'sub', 'creds.json')
      const creds: StoredCredentials = {
        type: 'api-key',
        apiKey: 'write-test',
      }
      await writeCredentials(nestedPath, creds)
      const raw = await fs.readFile(nestedPath, 'utf-8')
      expect(JSON.parse(raw)).toEqual(creds)
    })

    it('sets restrictive file permissions', async () => {
      const creds: StoredCredentials = {
        type: 'api-key',
        apiKey: 'perm-test',
      }
      await writeCredentials(credPath, creds)
      const stat = await fs.stat(credPath)
      const mode = stat.mode & 0o777
      expect(mode).toBe(0o600)
    })

    it('rejects invalid credentials', async () => {
      await expect(
        writeCredentials(credPath, { type: 'bad' } as unknown as StoredCredentials)
      ).rejects.toThrow()
    })
  })

  describe('clearCredentials', () => {
    it('removes existing file', async () => {
      await fs.writeFile(credPath, '{}')
      await clearCredentials(credPath)
      await expect(fs.access(credPath)).rejects.toThrow()
    })

    it('does not throw for nonexistent file', async () => {
      await expect(clearCredentials(credPath)).resolves.toBeUndefined()
    })
  })
})
