import { z } from 'zod'

export const OAuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiryDate: z.number(),
  tokenType: z.string().default('Bearer'),
})

export type OAuthTokens = z.infer<typeof OAuthTokensSchema>

export const OAuthCredentialsSchema = z.object({
  type: z.literal('oauth'),
  tokens: OAuthTokensSchema,
})

export const ApiKeyCredentialsSchema = z.object({
  type: z.literal('api-key'),
  apiKey: z.string().min(1),
})

export const StoredCredentialsSchema = z.discriminatedUnion('type', [
  OAuthCredentialsSchema,
  ApiKeyCredentialsSchema,
])

export type OAuthCredentials = z.infer<typeof OAuthCredentialsSchema>
export type ApiKeyCredentials = z.infer<typeof ApiKeyCredentialsSchema>
export type StoredCredentials = z.infer<typeof StoredCredentialsSchema>

export interface AuthState {
  readonly isAuthenticated: boolean
  readonly method: 'oauth' | 'api-key' | 'none'
  readonly expiresAt?: number
}

export interface GenerateContentRequest {
  readonly model: string
  readonly prompt: string
  readonly image?: {
    readonly data: string
    readonly mimeType: string
  }
  readonly referenceImages?: ReadonlyArray<{
    readonly data: string
    readonly mimeType: string
  }>
  readonly config?: {
    readonly responseModalities?: readonly string[]
  }
}

export interface GenerateContentResponse {
  readonly text?: string
  readonly image?: {
    readonly data: string
    readonly mimeType: string
  }
}

export interface GenAIAdapter {
  generateContent(
    request: GenerateContentRequest
  ): Promise<GenerateContentResponse>
}
