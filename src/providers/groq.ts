import type { ProviderDefinition } from "../types.js";

export const groq: ProviderDefinition = {
  id: "groq",
  name: "Groq",
  envKeys: ["GROQ_API_KEY"],
  keyPrefix: "gsk_",
  baseUrl: "https://api.groq.com/openai",
  docsUrl: "https://console.groq.com/keys",
  authStyle: "bearer",
  validateEndpoint: "/v1/models",
  openaiCompatible: true,
};
