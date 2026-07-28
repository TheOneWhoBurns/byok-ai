import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getProviderHeaders,
  getProviderBaseUrl,
  getOpenAICompatibleConfig,
} from "../src/config/helpers.js";
import { buildAuthHeaders, buildUrl } from "../src/config/helpers.js";
import { getProvider } from "../src/providers/registry.js";
import { initConfig } from "../src/config/resolver.js";

describe("Auth & URL Helpers", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    initConfig({});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("buildAuthHeaders", () => {
    it("should build x-api-key headers for Anthropic", () => {
      const provider = getProvider("anthropic")!;
      const headers = buildAuthHeaders(provider, "sk-ant-test-key-123456");

      expect(headers["x-api-key"]).toBe("sk-ant-test-key-123456");
      expect(headers["anthropic-version"]).toBe("2023-06-01");
      expect(headers["Authorization"]).toBeUndefined();
    });

    it("should build Bearer headers for OpenAI", () => {
      const provider = getProvider("openai")!;
      const headers = buildAuthHeaders(provider, "sk-test-key-123456789");

      expect(headers["Authorization"]).toBe("Bearer sk-test-key-123456789");
      expect(headers["x-api-key"]).toBeUndefined();
    });

    it("should build Bearer headers for OpenRouter", () => {
      const provider = getProvider("openrouter")!;
      const headers = buildAuthHeaders(provider, "sk-or-test-key-123456");

      expect(headers["Authorization"]).toBe("Bearer sk-or-test-key-123456");
    });

    it("should build Bearer headers for Groq", () => {
      const provider = getProvider("groq")!;
      const headers = buildAuthHeaders(provider, "gsk_test-key-1234567890");

      expect(headers["Authorization"]).toBe("Bearer gsk_test-key-1234567890");
    });

    it("should not set auth headers for query-param style (Google)", () => {
      const provider = getProvider("google")!;
      const headers = buildAuthHeaders(provider, "AIzaSyC-test-key-123");

      expect(headers["Authorization"]).toBeUndefined();
      expect(headers["x-api-key"]).toBeUndefined();
    });

    it("should merge custom headers from config", () => {
      const provider = getProvider("openai")!;
      const headers = buildAuthHeaders(provider, "sk-test-key-123456789", {
        headers: {
          "X-Custom-Header": "custom-value",
          "OpenAI-Organization": "org-12345",
        },
      });

      expect(headers["Authorization"]).toBe("Bearer sk-test-key-123456789");
      expect(headers["X-Custom-Header"]).toBe("custom-value");
      expect(headers["OpenAI-Organization"]).toBe("org-12345");
    });
  });

  describe("buildUrl", () => {
    it("should build a full URL for bearer-auth providers", () => {
      const provider = getProvider("openai")!;
      const url = buildUrl(provider, "/v1/models", "sk-test");

      expect(url).toBe("https://api.openai.com/v1/models");
    });

    it("should append key as query param for Google", () => {
      const provider = getProvider("google")!;
      const url = buildUrl(provider, "/v1beta/models", "AIzaSyC-test-key");

      expect(url).toContain("key=AIzaSyC-test-key");
      expect(url).toContain("generativelanguage.googleapis.com");
    });

    it("should use custom baseUrl from config", () => {
      const provider = getProvider("openai")!;
      const url = buildUrl(provider, "/v1/models", "sk-test", {
        baseUrl: "https://my-proxy.com",
      });

      expect(url).toBe("https://my-proxy.com/v1/models");
    });
  });

  describe("getProviderBaseUrl", () => {
    it("should return default base URLs", () => {
      expect(getProviderBaseUrl("anthropic")).toBe("https://api.anthropic.com");
      expect(getProviderBaseUrl("openai")).toBe("https://api.openai.com");
      expect(getProviderBaseUrl("openrouter")).toBe("https://openrouter.ai/api");
      expect(getProviderBaseUrl("groq")).toBe("https://api.groq.com/openai");
      expect(getProviderBaseUrl("google")).toBe("https://generativelanguage.googleapis.com");
      expect(getProviderBaseUrl("xai")).toBe("https://api.x.ai");
      expect(getProviderBaseUrl("mistral")).toBe("https://api.mistral.ai");
      expect(getProviderBaseUrl("deepseek")).toBe("https://api.deepseek.com");
    });

    it("should return config override when set", () => {
      initConfig({
        providers: {
          openai: { baseUrl: "https://my-openai-proxy.com" },
        },
      });

      expect(getProviderBaseUrl("openai")).toBe("https://my-openai-proxy.com");
      // Others should be unaffected
      expect(getProviderBaseUrl("anthropic")).toBe("https://api.anthropic.com");
    });
  });

  describe("getProviderHeaders", () => {
    it("should resolve key and return headers", async () => {
      process.env.OPENAI_API_KEY = "sk-headers-test-key-123";

      const headers = await getProviderHeaders("openai");
      expect(headers["Authorization"]).toBe("Bearer sk-headers-test-key-123");
    });

    it("should throw when no key is configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      initConfig({});

      await expect(getProviderHeaders("anthropic")).rejects.toThrow(/No API key configured/);
    });

    it("should throw for unknown providers", async () => {
      await expect(getProviderHeaders("fake-provider")).rejects.toThrow(/Unknown provider/);
    });
  });

  describe("getOpenAICompatibleConfig", () => {
    it("should return OpenAI-compatible config for OpenRouter", async () => {
      process.env.OPENROUTER_API_KEY = "sk-or-compat-test-123456";

      const config = await getOpenAICompatibleConfig("openrouter");
      expect(config.apiKey).toBe("sk-or-compat-test-123456");
      expect(config.baseURL).toBe("https://openrouter.ai/api");
    });

    it("should return OpenAI-compatible config for Groq", async () => {
      process.env.GROQ_API_KEY = "gsk_compat-test-key-1234567";

      const config = await getOpenAICompatibleConfig("groq");
      expect(config.apiKey).toBe("gsk_compat-test-key-1234567");
      expect(config.baseURL).toBe("https://api.groq.com/openai");
    });

    it("should include default headers for Anthropic", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-compat-test-12345";

      const config = await getOpenAICompatibleConfig("anthropic");
      expect(config.defaultHeaders).toBeDefined();
      expect(config.defaultHeaders!["anthropic-version"]).toBe("2023-06-01");
    });

    it("should use baseUrl override from config", async () => {
      process.env.OPENAI_API_KEY = "sk-baseurl-override-12345";

      initConfig({
        providers: {
          openai: { baseUrl: "https://custom-openai-proxy.com/v1" },
        },
      });

      const config = await getOpenAICompatibleConfig("openai");
      expect(config.baseURL).toBe("https://custom-openai-proxy.com/v1");
    });

    it("should throw when no key is configured", async () => {
      delete process.env.OPENAI_API_KEY;
      initConfig({});

      await expect(getOpenAICompatibleConfig("openai")).rejects.toThrow(/No API key configured/);
    });
  });
});
