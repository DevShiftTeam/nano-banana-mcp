import type { ApiKeyCredentials } from './types.js'
import { writeCredentials } from './token-store.js'

export function createApiKeyCredentials(apiKey: string): ApiKeyCredentials {
  if (!apiKey.trim()) {
    throw new Error('API key cannot be empty')
  }
  return {
    type: 'api-key',
    apiKey: apiKey.trim(),
  }
}

export async function saveApiKey(
  credentialsPath: string,
  apiKey: string
): Promise<void> {
  const credentials = createApiKeyCredentials(apiKey)
  await writeCredentials(credentialsPath, credentials)
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    )
    return response.ok
  } catch {
    return false
  }
}
