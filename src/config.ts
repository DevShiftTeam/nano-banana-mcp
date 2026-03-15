import { z } from 'zod'
import * as path from 'node:path'
import * as os from 'node:os'
import * as fs from 'node:fs/promises'

const CONFIG_DIR_ENV = 'NANO_BANANA_CONFIG_DIR'
const OUTPUT_DIR_ENV = 'NANO_BANANA_OUTPUT_DIR'
const CLIENT_ID_ENV = 'NANO_BANANA_CLIENT_ID'
const CLIENT_SECRET_ENV = 'NANO_BANANA_CLIENT_SECRET'
const API_KEY_ENV = 'GEMINI_API_KEY'

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.nano-banana')
const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), 'nano-banana-images')
const OAUTH_CALLBACK_PORT = 9876
const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_CALLBACK_PORT}/oauth/callback`
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/generative-language.retriever'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const TOKEN_EXPIRY_BUFFER_MS = 300_000

const DIR_PERMISSIONS = 0o700
const FILE_PERMISSIONS = 0o600

export const UserConfigSchema = z.object({
  authMethod: z.enum(['oauth', 'api-key']).default('oauth'),
  outputDir: z.string().default(DEFAULT_OUTPUT_DIR),
})

export type UserConfig = z.infer<typeof UserConfigSchema>

export interface AppConfig {
  readonly configDir: string
  readonly credentialsPath: string
  readonly configPath: string
  readonly outputDir: string
  readonly oauthCallbackPort: number
  readonly oauthRedirectUri: string
  readonly oauthScope: string
  readonly geminiApiBase: string
  readonly tokenExpiryBufferMs: number
  readonly envClientId: string | undefined
  readonly envClientSecret: string | undefined
  readonly envApiKey: string | undefined
}

export function createAppConfig(overrides?: Partial<AppConfig>): AppConfig {
  const configDir =
    overrides?.configDir ??
    process.env[CONFIG_DIR_ENV] ??
    DEFAULT_CONFIG_DIR

  return {
    configDir,
    credentialsPath: path.join(configDir, 'credentials.json'),
    configPath: path.join(configDir, 'config.json'),
    outputDir:
      overrides?.outputDir ??
      process.env[OUTPUT_DIR_ENV] ??
      DEFAULT_OUTPUT_DIR,
    oauthCallbackPort: overrides?.oauthCallbackPort ?? OAUTH_CALLBACK_PORT,
    oauthRedirectUri: overrides?.oauthRedirectUri ?? OAUTH_REDIRECT_URI,
    oauthScope: overrides?.oauthScope ?? OAUTH_SCOPE,
    geminiApiBase: overrides?.geminiApiBase ?? GEMINI_API_BASE,
    tokenExpiryBufferMs: overrides?.tokenExpiryBufferMs ?? TOKEN_EXPIRY_BUFFER_MS,
    envClientId: process.env[CLIENT_ID_ENV],
    envClientSecret: process.env[CLIENT_SECRET_ENV],
    envApiKey: process.env[API_KEY_ENV],
  }
}

export async function loadUserConfig(configPath: string): Promise<UserConfig> {
  let raw: string
  try {
    raw = await fs.readFile(configPath, 'utf-8')
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === 'ENOENT') {
      return UserConfigSchema.parse({})
    }
    throw new Error(`Failed to read config file: ${nodeError.message}`)
  }

  try {
    return UserConfigSchema.parse(JSON.parse(raw))
  } catch (error) {
    throw new Error(
      `Invalid config file at ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export async function saveUserConfig(
  configPath: string,
  config: UserConfig
): Promise<void> {
  const dir = path.dirname(configPath)
  await fs.mkdir(dir, { recursive: true, mode: DIR_PERMISSIONS })
  await fs.writeFile(
    configPath,
    JSON.stringify(config, null, 2),
    { encoding: 'utf-8', mode: FILE_PERMISSIONS }
  )
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true, mode: DIR_PERMISSIONS })
}
