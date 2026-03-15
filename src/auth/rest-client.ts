import type { AppConfig } from '../config.js'
import type {
  GenAIAdapter,
  GenerateContentRequest,
  GenerateContentResponse,
} from './types.js'
import { ensureValidTokens } from './oauth.js'

interface GeminiPart {
  readonly text?: string
  readonly inlineData?: {
    readonly mimeType: string
    readonly data: string
  }
}

interface GeminiContent {
  readonly parts: readonly GeminiPart[]
}

interface GeminiCandidate {
  readonly content: {
    readonly parts: readonly GeminiPart[]
  }
}

interface GeminiResponse {
  readonly candidates?: readonly GeminiCandidate[]
}

function buildRequestParts(request: GenerateContentRequest): readonly GeminiPart[] {
  const imagePart: readonly GeminiPart[] = request.image
    ? [
        {
          inlineData: {
            mimeType: request.image.mimeType,
            data: request.image.data,
          },
        },
      ]
    : []

  const referenceParts: readonly GeminiPart[] = (request.referenceImages ?? []).map(
    (ref) => ({
      inlineData: {
        mimeType: ref.mimeType,
        data: ref.data,
      },
    })
  )

  return [...imagePart, ...referenceParts, { text: request.prompt }]
}

function parseResponse(response: GeminiResponse): GenerateContentResponse {
  const candidate = response.candidates?.[0]
  if (!candidate) {
    throw new Error('No response candidate from Gemini API')
  }

  const textPart = candidate.content.parts.find((p) => p.text)
  const imagePart = candidate.content.parts.find((p) => p.inlineData)

  return {
    ...(textPart?.text ? { text: textPart.text } : {}),
    ...(imagePart?.inlineData
      ? {
          image: {
            data: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
          },
        }
      : {}),
  }
}

export function createRestClient(config: AppConfig): GenAIAdapter {
  return {
    async generateContent(
      request: GenerateContentRequest
    ): Promise<GenerateContentResponse> {
      const tokens = await ensureValidTokens(config)

      const contents: readonly GeminiContent[] = [
        { parts: buildRequestParts(request) },
      ]

      const generationConfig = request.config?.responseModalities
        ? { responseModalities: request.config.responseModalities }
        : undefined

      const body = {
        contents,
        ...(generationConfig ? { generationConfig } : {}),
      }

      const url = `${config.geminiApiBase}/models/${encodeURIComponent(request.model)}:generateContent`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Gemini API error (${response.status}): ${errorText}`
        )
      }

      const data = (await response.json()) as GeminiResponse
      return parseResponse(data)
    },
  }
}
