import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getProvider,
  listProviders,
  hasProvider,
  registerProvider,
  resolveKey,
  validateKeyFormat,
  getEnvVarName,
  hasEnvKey,
  getProviderBaseUrl,
  initConfig,
  DEFAULT_FALLBACK_ORDER,
} from "../src/index.js";

describe("Provider Registry", () => {
  it("should have all built-in providers registered", () => {
    const providers = listProviders();
    expect(providers.length).toBeGreaterThanOrEqual(8);

    const ids = providers.map((p) => p.id);
    expect(ids).toContain("anthropic");
    expect(ids).toContain("openai");
    expect(ids).toContain("openrouter");
    expect(ids).toContain("google");
    expect(ids).toContain("groq");
    expect(ids).toContain("xai");
    expect(ids).toContain("mistral");
    expect(ids).toContain("deepseek");
  });

  it("should get a provider by ID", () => {
    const anthropic = getProvider("anthropic");
    expect(anthropic).toBeDefined();
    expect(anthropic!.name).toBe("Anthropic");
    expect(anthropic!.envKeys).toContain("ANTHROPIC_API_KEY");
    expect(anthropic!.baseUrl).toBe("https://api.anthropic.com");
  });

  it("should check if provider exists", () => {
    expect(hasProvider("anthropic")).toBe(true);
    expect(hasProvider("nonexistent")).toBe(false);
  });

  it("should register custom providers", () => {
    registerProvider({
      id: "custom-local",
      name: "My Local LLM",
      envKeys: ["LOCAL_LLM_KEY"],
      baseUrl: "http://localhost:8080",
      docsUrl: "https://example.com",
      authStyle: "bearer",
      openaiCompatible: true,
    });

    expect(hasProvider("custom-local")).toBe(true);
    const custom = getProvider("custom-local");
    expect(custom!.name).toBe("My Local LLM");
  });

  it("should have a default fallback order", () => {
    expect(DEFAULT_FALLBACK_ORDER.length).toBeGreaterThan(0);
    expect(DEFAULT_FALLBACK_ORDER[0]).toBe("anthropic");
  });
});

describe("Key Format Validation", () => {
  it("should validate Anthropic key format", () => {
    expect(validateKeyFormat("anthropic", "sk-ant-abc123def456").valid).toBe(true);
    expect(validateKeyFormat("anthropic", "wrong-prefix-key").valid).toBe(false);
    expect(validateKeyFormat("anthropic", "").valid).toBe(false);
  });

  it("should validate OpenAI key format", () => {
    expect(validateKeyFormat("openai", "sk-abc123def456ghij").valid).toBe(true);
  });

  it("should validate OpenRouter key format", () => {
    expect(validateKeyFormat("openrouter", "sk-or-abc123def456").valid).toBe(true);
    expect(validateKeyFormat("openrouter", "sk-abc123def456").valid).toBe(false);
  });

  it("should validate Groq key format", () => {
    expect(validateKeyFormat("groq", "gsk_abc123def456ghij").valid).toBe(true);
  });

  it("should reject empty keys", () => {
    expect(validateKeyFormat("openai", "").valid).toBe(false);
  });

  it("should reject too-short keys", () => {
    expect(validateKeyFormat("openai", "sk-123").valid).toBe(false);
  });

  it("should return error for unknown providers", () => {
    const result = validateKeyFormat("nonexistent", "some-key");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unknown provider");
  });
});

describe("Environment Variable Helpers", () => {
  it("should return env var name for providers", () => {
    expect(getEnvVarName("anthropic")).toBe("ANTHROPIC_API_KEY");
    expect(getEnvVarName("openai")).toBe("OPENAI_API_KEY");
    expect(getEnvVarName("openrouter")).toBe("OPENROUTER_API_KEY");
  });

  it("should return null for unknown providers", () => {
    expect(getEnvVarName("nonexistent")).toBeNull();
  });
});

describe("Key Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    initConfig({});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should resolve key from environment variable", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345";

    const result = await resolveKey("anthropic");
    expect(result).toBeDefined();
    expect(result!.key).toBe("sk-ant-test-key-12345");
    expect(result!.source).toBe("env");
    expect(result!.envVar).toBe("ANTHROPIC_API_KEY");
  });

  it("should prefer runtime key over env var", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-env-key-12345";

    const result = await resolveKey("anthropic", "sk-ant-runtime-key-12345");
    expect(result).toBeDefined();
    expect(result!.key).toBe("sk-ant-runtime-key-12345");
    expect(result!.source).toBe("runtime");
  });

  it("should return null when no key configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await resolveKey("anthropic");
    expect(result).toBeNull();
  });

  it("should return null for unknown providers", async () => {
    const result = await resolveKey("nonexistent");
    expect(result).toBeNull();
  });
});

describe("Provider Base URLs", () => {
  it("should return correct base URLs", () => {
    expect(getProviderBaseUrl("anthropic")).toBe("https://api.anthropic.com");
    expect(getProviderBaseUrl("openai")).toBe("https://api.openai.com");
    expect(getProviderBaseUrl("openrouter")).toBe("https://openrouter.ai/api");
    expect(getProviderBaseUrl("groq")).toBe("https://api.groq.com/openai");
  });
});
