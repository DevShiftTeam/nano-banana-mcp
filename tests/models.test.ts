import { describe, it, expect } from 'vitest'
import {
  getDefaultModel,
  getModelById,
  listModels,
  resolveModelId,
} from '../src/models.js'

describe('models', () => {
  describe('getDefaultModel', () => {
    it('returns gemini-3.1-flash-image-preview as default', () => {
      const model = getDefaultModel()
      expect(model.id).toBe('gemini-3.1-flash-image-preview')
      expect(model.isDefault).toBe(true)
    })
  })

  describe('getModelById', () => {
    it('returns model for valid id', () => {
      const model = getModelById('gemini-3-pro-image-preview')
      expect(model).toBeDefined()
      expect(model!.product).toBe('Nano Banana Pro')
    })

    it('returns undefined for unknown id', () => {
      const model = getModelById('nonexistent-model')
      expect(model).toBeUndefined()
    })
  })

  describe('listModels', () => {
    it('returns all 3 models', () => {
      const models = listModels()
      expect(models).toHaveLength(3)
    })

    it('contains exactly one default', () => {
      const defaults = listModels().filter((m) => m.isDefault)
      expect(defaults).toHaveLength(1)
    })
  })

  describe('resolveModelId', () => {
    it('returns default model when no id provided', () => {
      const id = resolveModelId()
      expect(id).toBe('gemini-3.1-flash-image-preview')
    })

    it('returns provided id when valid', () => {
      const id = resolveModelId('gemini-2.5-flash-image')
      expect(id).toBe('gemini-2.5-flash-image')
    })

    it('throws for unknown model', () => {
      expect(() => resolveModelId('bad-model')).toThrow('Unknown model')
    })
  })
})
