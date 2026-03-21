import type { ProviderDefinition } from "../types.js";

export const openai: ProviderDefinition = {
  id: "openai",
  name: "OpenAI",
  envKeys: ["OPENAI_API_KEY"],
  keyPrefix: "sk-",
  baseUrl: "https://api.openai.com",
  docsUrl: "https://platform.openai.com/api-keys",
  authStyle: "bearer",
  validateEndpoint: "/v1/models",
  openaiCompatible: true,
};
