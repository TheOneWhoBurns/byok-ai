import type { ProviderDefinition } from "../types.js";

export const google: ProviderDefinition = {
  id: "google",
  name: "Google Gemini",
  envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
  baseUrl: "https://generativelanguage.googleapis.com",
  docsUrl: "https://aistudio.google.com/app/apikey",
  authStyle: "query-param",
  validateEndpoint: "/v1beta/models",
  openaiCompatible: false,
};
