/**
 * WaveSpeed Provider Implementation
 *
 * Implements ProviderInterface for WaveSpeed AI's image/video generation.
 * Uses WaveSpeed's v3 API with async task submission and polling.
 *
 * API Documentation:
 * - Submit task: POST https://api.wavespeed.ai/api/v3/{model-id}
 * - Get result: GET https://api.wavespeed.ai/api/v3/predictions/{task-id}
 *
 * Usage:
 *   import "@/lib/providers/wavespeed"; // Just importing registers the provider
 *
 *   // Or get it from registry:
 *   import { getProvider } from "@/lib/providers";
 *   const wavespeed = getProvider("wavespeed");
 */

import {
  ProviderInterface,
  ProviderModel,
  GenerationInput,
  GenerationOutput,
  registerProvider,
} from "@/lib/providers";

const PROVIDER_SETTINGS_KEY = "node-banana-provider-settings";

/**
 * Get API key from localStorage (client-side only)
 * Returns null when running on server or if not configured
 */
function getApiKeyFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const settingsJson = localStorage.getItem(PROVIDER_SETTINGS_KEY);
    if (!settingsJson) return null;

    const settings = JSON.parse(settingsJson);
    return settings?.providers?.wavespeed?.apiKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Fallback static list of WaveSpeed models (client-side only)
 * The main model listing is done via /api/models which fetches from https://api.wavespeed.ai/api/v3/models
 * This fallback is used when the API isn't available or for quick lookups
 */
const WAVESPEED_MODELS: ProviderModel[] = [
  {
    id: "wavespeed-ai/flux-dev",
    name: "FLUX Dev",
    description: "High-quality image generation model from WaveSpeed",
    provider: "wavespeed",
    capabilities: ["text-to-image", "image-to-image"],
    pricing: {
      type: "per-run",
      amount: 0.003, // Approximate
      currency: "USD",
    },
  },
  {
    id: "wavespeed-ai/flux-schnell",
    name: "FLUX Schnell",
    description: "Fast image generation model optimized for speed",
    provider: "wavespeed",
    capabilities: ["text-to-image", "image-to-image"],
    pricing: {
      type: "per-run",
      amount: 0.001, // Approximate
      currency: "USD",
    },
  },
  {
    id: "wavespeed-ai/sd3-medium",
    name: "Stable Diffusion 3 Medium",
    description: "Stable Diffusion 3 medium model for balanced quality and speed",
    provider: "wavespeed",
    capabilities: ["text-to-image", "image-to-image"],
    pricing: {
      type: "per-run",
      amount: 0.002,
      currency: "USD",
    },
  },
  {
    id: "wavespeed-ai/wan-2.1",
    name: "WAN 2.1",
    description: "Text-to-video generation model",
    provider: "wavespeed",
    capabilities: ["text-to-video"],
    pricing: {
      type: "per-run",
      amount: 0.05,
      currency: "USD",
    },
  },
];

/**
 * WaveSpeed provider implementation
 */
const wavespeedProvider: ProviderInterface = {
  id: "wavespeed",
  name: "WaveSpeed",

  async listModels(): Promise<ProviderModel[]> {
    // WaveSpeed doesn't have a public models API, return static list
    // Only return models if API key is configured (to signal availability)
    const apiKey = getApiKeyFromStorage();
    if (!apiKey) {
      console.warn("[WaveSpeed] No API key configured, returning empty model list");
      return [];
    }
    return WAVESPEED_MODELS;
  },

  async searchModels(query: string): Promise<ProviderModel[]> {
    const apiKey = getApiKeyFromStorage();
    if (!apiKey) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    return WAVESPEED_MODELS.filter(
      (model) =>
        model.name.toLowerCase().includes(lowerQuery) ||
        model.id.toLowerCase().includes(lowerQuery) ||
        model.description?.toLowerCase().includes(lowerQuery)
    );
  },

  async getModel(modelId: string): Promise<ProviderModel | null> {
    const apiKey = getApiKeyFromStorage();
    if (!apiKey) {
      return null;
    }

    return WAVESPEED_MODELS.find((m) => m.id === modelId) || null;
  },

  async generate(input: GenerationInput): Promise<GenerationOutput> {
    const apiKey = getApiKeyFromStorage();
    if (!apiKey) {
      return {
        success: false,
        error: "WaveSpeed API key not configured",
      };
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WaveSpeed-API-Key": apiKey,
        },
        body: JSON.stringify({
          provider: "wavespeed",
          model: input.model,
          prompt: input.prompt,
          images: input.images,
          parameters: input.parameters,
          dynamicInputs: input.dynamicInputs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        return {
          success: false,
          error: errorData?.error || `HTTP ${response.status}`,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: `WaveSpeed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  isConfigured(): boolean {
    return !!getApiKeyFromStorage();
  },

  getApiKey(): string | null {
    return getApiKeyFromStorage();
  },
};

// Self-register when module is imported
registerProvider(wavespeedProvider);

export default wavespeedProvider;

// Export static models for use in API routes
export { WAVESPEED_MODELS };
