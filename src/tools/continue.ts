import type { AppConfig } from '../config.js'
import type { GenAIAdapter } from '../auth/types.js'
import { resolveModelId } from '../models.js'
import { getLastImage, readImageFile, saveImage } from '../images/storage.js'
import type { ContinueEditingInput } from './schemas.js'

export async function continueEditing(
  input: ContinueEditingInput,
  client: GenAIAdapter,
  config: AppConfig
): Promise<{ filePath: string; model: string; sizeBytes: number }> {
  const lastImage = getLastImage()

  if (!lastImage) {
    throw new Error(
      'No previous image found. Use generate_image or edit_image first.'
    )
  }

  const modelId = resolveModelId(input.model)
  const sourceImage = await readImageFile(lastImage.filePath)

  const response = await client.generateContent({
    model: modelId,
    prompt: input.prompt,
    image: sourceImage,
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
    'continued'
  )

  return {
    filePath: metadata.filePath,
    model: modelId,
    sizeBytes: metadata.sizeBytes,
  }
}
