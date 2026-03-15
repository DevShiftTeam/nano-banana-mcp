import { z } from 'zod'
import { ModelIdSchema } from '../models.js'

export const GenerateImageSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .describe('Text description of the image to generate, e.g. "a watercolor painting of a sunset over mountains"'),
  model: ModelIdSchema
    .optional()
    .describe('Model ID to use. Options: gemini-3.1-flash-image-preview (default), gemini-2.5-flash-image, gemini-3-pro-image-preview'),
  aspectRatio: z
    .enum(['1:1', '16:9', '9:16', '4:3', '3:4'])
    .optional()
    .default('1:1')
    .describe('Aspect ratio of the generated image. Default: 1:1'),
})

export type GenerateImageInput = z.infer<typeof GenerateImageSchema>

export const GenerateImageOutputSchema = z.object({
  filePath: z.string().describe('Absolute path where the generated image was saved'),
  model: z.string().describe('Model ID that was used for generation'),
  sizeBytes: z.number().describe('Size of the generated image in bytes'),
})

export const EditImageSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .describe('Instructions for how to edit the image, e.g. "change the sky to purple" or "remove the background"'),
  imagePath: z
    .string()
    .min(1, 'Image path is required')
    .describe('Absolute path to the source image to edit. Supported formats: PNG, JPG, JPEG, GIF, WebP, BMP'),
  referenceImages: z
    .array(z.string())
    .optional()
    .describe('Optional array of absolute paths to reference images for style or context'),
  model: ModelIdSchema
    .optional()
    .describe('Model ID to use. Options: gemini-3.1-flash-image-preview (default), gemini-2.5-flash-image, gemini-3-pro-image-preview'),
})

export type EditImageInput = z.infer<typeof EditImageSchema>

export const EditImageOutputSchema = z.object({
  filePath: z.string().describe('Absolute path where the edited image was saved'),
  model: z.string().describe('Model ID that was used for editing'),
  sizeBytes: z.number().describe('Size of the edited image in bytes'),
})

export const ContinueEditingSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .describe('Instructions for refining the last generated or edited image, e.g. "make the colors more vibrant"'),
  model: ModelIdSchema
    .optional()
    .describe('Model ID to use. Options: gemini-3.1-flash-image-preview (default), gemini-2.5-flash-image, gemini-3-pro-image-preview'),
})

export type ContinueEditingInput = z.infer<typeof ContinueEditingSchema>

export const ContinueEditingOutputSchema = z.object({
  filePath: z.string().describe('Absolute path where the refined image was saved'),
  model: z.string().describe('Model ID that was used'),
  sizeBytes: z.number().describe('Size of the refined image in bytes'),
})

export const ConfigureAuthSchema = z.object({
  apiKey: z
    .string()
    .min(1, 'API key is required')
    .describe('Gemini API key from Google AI Studio (https://aistudio.google.com/apikey)'),
})

export type ConfigureAuthInput = z.infer<typeof ConfigureAuthSchema>

export const ConfigureAuthOutputSchema = z.object({
  message: z.string().describe('Result message confirming the API key was saved'),
})

export const StatusOutputSchema = z.object({
  auth: z.object({
    isAuthenticated: z.boolean(),
    method: z.string(),
    expiresAt: z.number().optional(),
  }),
  currentModel: z.string(),
  outputDir: z.string(),
})

export const LastImageOutputSchema = z.object({
  filePath: z.string(),
  mimeType: z.string(),
  timestamp: z.number(),
  sizeBytes: z.number(),
}).nullable()

export const ModelInfoSchema = z.object({
  id: z.string(),
  product: z.string(),
  isDefault: z.boolean(),
  description: z.string(),
})

export const ListModelsOutputSchema = z.object({
  models: z.array(ModelInfoSchema),
})
