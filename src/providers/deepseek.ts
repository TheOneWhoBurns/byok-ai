import type { ProviderDefinition } from "../types.js";

export const deepseek: ProviderDefinition = {
  id: "deepseek",
  name: "DeepSeek",
  envKeys: ["DEEPSEEK_API_KEY"],
  keyPrefix: "sk-",
  baseUrl: "https://api.deepseek.com",
  docsUrl: "https://platform.deepseek.com/api_keys",
  authStyle: "bearer",
  validateEndpoint: "/models",
  openaiCompatible: true,
};
