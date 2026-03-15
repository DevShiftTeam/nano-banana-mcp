import type { AppConfig } from '../config.js'
import type { GenAIAdapter } from '../auth/types.js'
import { resolveModelId } from '../models.js'
import { saveImage } from '../images/storage.js'
import { readImageFile } from '../images/storage.js'
import type { EditImageInput } from './schemas.js'

export async function editImage(
  input: EditImageInput,
  client: GenAIAdapter,
  config: AppConfig
): Promise<{ filePath: string; model: string; sizeBytes: number }> {
  const modelId = resolveModelId(input.model)

  const sourceImage = await readImageFile(input.imagePath)

  const referenceImages = input.referenceImages
    ? await Promise.all(input.referenceImages.map(readImageFile))
    : undefined

  const response = await client.generateContent({
    model: modelId,
    prompt: input.prompt,
    image: sourceImage,
    referenceImages,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  })

  if (!response.image) {
    throw new Error(
      response.text
        ? `Model returned text but no image: ${response.text}`
        : 'No edited image generated. Try a different prompt or model.'
    )
  }

  const metadata = await saveImage(
    config.outputDir,
    response.image.data,
    response.image.mimeType,
    'edited'
  )

  return {
    filePath: metadata.filePath,
    model: modelId,
    sizeBytes: metadata.sizeBytes,
  }
}
