import { z } from 'zod'

export const ModelIdSchema = z.enum([
  'gemini-3.1-flash-image-preview',
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
])

export type ModelId = z.infer<typeof ModelIdSchema>

export interface Model {
  readonly id: ModelId
  readonly product: string
  readonly isDefault: boolean
  readonly description: string
}

const MODELS: readonly Model[] = [
  {
    id: 'gemini-3.1-flash-image-preview',
    product: 'Nano Banana 2',
    isDefault: true,
    description: 'Fast image generation with Gemini 3.1 Flash',
  },
  {
    id: 'gemini-2.5-flash-image',
    product: 'Nano Banana 2',
    isDefault: false,
    description: 'Image generation with Gemini 2.5 Flash',
  },
  {
    id: 'gemini-3-pro-image-preview',
    product: 'Nano Banana Pro',
    isDefault: false,
    description: 'High-quality image generation with Gemini 3 Pro',
  },
] as const

export function getDefaultModel(): Model {
  const model = MODELS.find((m) => m.isDefault)
  if (!model) {
    throw new Error('No default model configured')
  }
  return model
}

export function getModelById(id: string): Model | undefined {
  return MODELS.find((m) => m.id === id)
}

export function listModels(): readonly Model[] {
  return MODELS
}

export function resolveModelId(modelId?: string): ModelId {
  if (!modelId) {
    return getDefaultModel().id
  }
  const model = getModelById(modelId)
  if (!model) {
    throw new Error(
      `Unknown model: ${modelId}. Available: ${MODELS.map((m) => m.id).join(', ')}`
    )
  }
  return model.id
}
