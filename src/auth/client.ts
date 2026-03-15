import { GoogleGenAI } from '@google/genai'
import type { AppConfig } from '../config.js'
import type {
  GenAIAdapter,
  GenerateContentRequest,
  GenerateContentResponse,
} from './types.js'
import { readCredentials } from './token-store.js'
import { createRestClient } from './rest-client.js'

export function createSdkAdapter(apiKey: string): GenAIAdapter {
  const genai = new GoogleGenAI({ apiKey })

  return {
    async generateContent(
      request: GenerateContentRequest
    ): Promise<GenerateContentResponse> {
      const imageParts = request.image
        ? [
            {
              inlineData: {
                mimeType: request.image.mimeType,
                data: request.image.data,
              },
            },
          ]
        : []

      const referenceParts = (request.referenceImages ?? []).map((ref) => ({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.data,
        },
      }))

      const contents = [
        ...imageParts,
        ...referenceParts,
        { text: request.prompt },
      ]

      const response = await genai.models.generateContent({
        model: request.model,
        contents,
        config: request.config
          ? {
              responseModalities: request.config.responseModalities as
                | ('TEXT' | 'IMAGE')[]
                | undefined,
            }
          : undefined,
      })

      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData
      )

      return {
        ...(response.text ? { text: response.text } : {}),
        ...(imagePart?.inlineData
          ? {
              image: {
                data: imagePart.inlineData.data ?? '',
                mimeType: imagePart.inlineData.mimeType ?? 'image/png',
              },
            }
          : {}),
      }
    },
  }
}

export async function createGenAIClient(
  config: AppConfig
): Promise<GenAIAdapter> {
  const envApiKey = config.envApiKey
  if (envApiKey) {
    return createSdkAdapter(envApiKey)
  }

  const credentials = await readCredentials(config.credentialsPath)

  if (!credentials) {
    throw new Error(
      'No credentials found. Run `npx nano-banana-mcp setup` to configure authentication.'
    )
  }

  if (credentials.type === 'api-key') {
    return createSdkAdapter(credentials.apiKey)
  }

  return createRestClient(config)
}

export async function getAuthState(
  config: AppConfig
): Promise<{
  isAuthenticated: boolean
  method: 'oauth' | 'api-key' | 'none'
  expiresAt?: number
}> {
  if (config.envApiKey) {
    return { isAuthenticated: true, method: 'api-key' }
  }

  const credentials = await readCredentials(config.credentialsPath)

  if (!credentials) {
    return { isAuthenticated: false, method: 'none' }
  }

  if (credentials.type === 'api-key') {
    return { isAuthenticated: true, method: 'api-key' }
  }

  return {
    isAuthenticated: true,
    method: 'oauth',
    expiresAt: credentials.tokens.expiryDate,
  }
}
