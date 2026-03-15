import { describe, it, expect } from 'vitest'
import {
  GenerateImageSchema,
  EditImageSchema,
  ContinueEditingSchema,
  ConfigureAuthSchema,
} from '../../src/tools/schemas.js'

describe('schemas', () => {
  describe('GenerateImageSchema', () => {
    it('accepts valid input', () => {
      const result = GenerateImageSchema.parse({ prompt: 'a banana' })
      expect(result.prompt).toBe('a banana')
      expect(result.aspectRatio).toBe('1:1')
    })

    it('accepts all optional fields', () => {
      const result = GenerateImageSchema.parse({
        prompt: 'test',
        model: 'gemini-3-pro-image-preview',
        aspectRatio: '16:9',
      })
      expect(result.model).toBe('gemini-3-pro-image-preview')
      expect(result.aspectRatio).toBe('16:9')
    })

    it('rejects empty prompt', () => {
      expect(() => GenerateImageSchema.parse({ prompt: '' })).toThrow()
    })

    it('rejects invalid aspect ratio', () => {
      expect(() =>
        GenerateImageSchema.parse({ prompt: 'test', aspectRatio: '2:1' })
      ).toThrow()
    })
  })

  describe('EditImageSchema', () => {
    it('accepts valid input', () => {
      const result = EditImageSchema.parse({
        prompt: 'make it blue',
        imagePath: '/path/to/image.png',
      })
      expect(result.prompt).toBe('make it blue')
      expect(result.imagePath).toBe('/path/to/image.png')
    })

    it('accepts reference images', () => {
      const result = EditImageSchema.parse({
        prompt: 'style transfer',
        imagePath: '/path/to/image.png',
        referenceImages: ['/ref1.png', '/ref2.png'],
      })
      expect(result.referenceImages).toHaveLength(2)
    })

    it('rejects missing imagePath', () => {
      expect(() =>
        EditImageSchema.parse({ prompt: 'edit' })
      ).toThrow()
    })
  })

  describe('ContinueEditingSchema', () => {
    it('accepts valid input', () => {
      const result = ContinueEditingSchema.parse({ prompt: 'refine colors' })
      expect(result.prompt).toBe('refine colors')
    })

    it('accepts optional model', () => {
      const result = ContinueEditingSchema.parse({
        prompt: 'refine',
        model: 'gemini-2.5-flash-image',
      })
      expect(result.model).toBe('gemini-2.5-flash-image')
    })
  })

  describe('ConfigureAuthSchema', () => {
    it('accepts valid API key', () => {
      const result = ConfigureAuthSchema.parse({ apiKey: 'key-123' })
      expect(result.apiKey).toBe('key-123')
    })

    it('rejects empty API key', () => {
      expect(() => ConfigureAuthSchema.parse({ apiKey: '' })).toThrow()
    })
  })
})
