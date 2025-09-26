/**
 * Centralized configuration for AI models.
 * This separates model names from the application logic, making it easier
 * to update or swap models in the future without changing service code.
 */
export const MODELS = {
  text: 'gemini-2.5-flash',
  imageGeneration: 'imagen-4.0-generate-001',
  imageEdit: 'gemini-2.5-flash-image-preview',
  videoGenerationDefault: 'veo-3.0-generate-001',
  videoGenerationOptions: [
    { id: 'veo-3.0-generate-001', label: 'Veo 3 (Highest Quality)' },
    { id: 'veo-3.0-fast-generate-001', label: 'Veo 3 (Fast)' },
    { id: 'veo-2.0-generate-001', label: 'Veo 2' },
  ],
};