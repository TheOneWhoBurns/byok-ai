import type { ProviderDefinition } from "../types.js";

export const mistral: ProviderDefinition = {
  id: "mistral",
  name: "Mistral AI",
  envKeys: ["MISTRAL_API_KEY"],
  baseUrl: "https://api.mistral.ai",
  docsUrl: "https://console.mistral.ai/api-keys",
  authStyle: "bearer",
  validateEndpoint: "/v1/models",
  openaiCompatible: true,
};
