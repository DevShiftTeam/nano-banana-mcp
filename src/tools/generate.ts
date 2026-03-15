import type { AppConfig } from '../config.js'
import type { GenAIAdapter } from '../auth/types.js'
import { resolveModelId } from '../models.js'
import { saveImage } from '../images/storage.js'
import type { GenerateImageInput } from './schemas.js'

export async function generateImage(
  input: GenerateImageInput,
  client: GenAIAdapter,
  config: AppConfig
): Promise<{ filePath: string; model: string; sizeBytes: number }> {
  const modelId = resolveModelId(input.model)

  const prompt = input.aspectRatio
    ? `${input.prompt} (aspect ratio: ${input.aspectRatio})`
    : input.prompt

  const response = await client.generateContent({
    model: modelId,
    prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  })

  if (!response.image) {
    throw new Error(
      response.text
        ? `Model returned text but no image: ${response.text}`
        : 'No image generated. Try a different prompt or model.'
    )
  }

  const metadata = await saveImage(
    config.outputDir,
    response.image.data,
    response.image.mimeType,
    'generated'
  )

  return {
    filePath: metadata.filePath,
    model: modelId,
    sizeBytes: metadata.sizeBytes,
  }
}
