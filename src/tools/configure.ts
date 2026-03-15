import type { AppConfig } from '../config.js'
import { saveApiKey, getAuthState } from '../auth/index.js'
import { getLastImage } from '../images/storage.js'
import { listModels, getDefaultModel } from '../models.js'
import type { ConfigureAuthInput } from './schemas.js'

export async function configureAuth(
  input: ConfigureAuthInput,
  config: AppConfig
): Promise<{ message: string }> {
  await saveApiKey(config.credentialsPath, input.apiKey)
  return { message: 'API key saved successfully.' }
}

export async function getStatus(
  config: AppConfig
): Promise<{
  auth: { isAuthenticated: boolean; method: string; expiresAt?: number }
  currentModel: string
  outputDir: string
}> {
  const auth = await getAuthState(config)

  return {
    auth,
    currentModel: getDefaultModel().id,
    outputDir: config.outputDir,
  }
}

export function getLastImageInfo(): {
  filePath: string
  mimeType: string
  timestamp: number
  sizeBytes: number
} | null {
  return getLastImage()
}

export function getAvailableModels(): Array<{
  id: string
  product: string
  isDefault: boolean
  description: string
}> {
  return listModels().map((m) => ({ ...m }))
}
