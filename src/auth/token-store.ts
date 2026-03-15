import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { StoredCredentials, StoredCredentialsSchema } from './types.js'

const FILE_PERMISSIONS = 0o600
const DIR_PERMISSIONS = 0o700

export async function readCredentials(
  credentialsPath: string
): Promise<StoredCredentials | null> {
  let raw: string
  try {
    raw = await fs.readFile(credentialsPath, 'utf-8')
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === 'ENOENT') {
      return null
    }
    throw new Error(`Failed to read credentials: ${nodeError.message}`)
  }

  try {
    return StoredCredentialsSchema.parse(JSON.parse(raw))
  } catch (error) {
    throw new Error(
      `Invalid credentials file at ${credentialsPath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export async function writeCredentials(
  credentialsPath: string,
  credentials: StoredCredentials
): Promise<void> {
  const validated = StoredCredentialsSchema.parse(credentials)
  const dir = path.dirname(credentialsPath)
  await fs.mkdir(dir, { recursive: true, mode: DIR_PERMISSIONS })
  await fs.writeFile(
    credentialsPath,
    JSON.stringify(validated, null, 2),
    { encoding: 'utf-8', mode: FILE_PERMISSIONS }
  )
}

export async function clearCredentials(
  credentialsPath: string
): Promise<void> {
  try {
    await fs.unlink(credentialsPath)
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code !== 'ENOENT') {
      throw error
    }
  }
}
