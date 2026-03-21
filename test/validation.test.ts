import { describe, it, expect } from "vitest";
import { validateKeyFormat } from "../src/validation/validator.js";

describe("Key Format Validation", () => {
  describe("Anthropic", () => {
    it("should accept valid Anthropic keys", () => {
      expect(validateKeyFormat("anthropic", "sk-ant-abc123def456ghij789klmno").valid).toBe(true);
    });

    it("should reject keys without sk-ant- prefix", () => {
      const result = validateKeyFormat("anthropic", "sk-abc123def456ghij789klmno");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("sk-ant-");
    });
  });

  describe("OpenAI", () => {
    it("should accept valid OpenAI keys", () => {
      expect(validateKeyFormat("openai", "sk-abc123def456ghij789klmnop").valid).toBe(true);
    });

    it("should accept newer OpenAI key formats", () => {
      expect(validateKeyFormat("openai", "sk-proj-abc123def456ghij789").valid).toBe(true);
    });

    it("should reject keys without sk- prefix", () => {
      const result = validateKeyFormat("openai", "abc123def456ghij789klmnop");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("sk-");
    });
  });

  describe("OpenRouter", () => {
    it("should accept valid OpenRouter keys", () => {
      expect(validateKeyFormat("openrouter", "sk-or-abc123def456ghij789").valid).toBe(true);
    });

    it("should reject OpenAI-style keys for OpenRouter", () => {
      const result = validateKeyFormat("openrouter", "sk-abc123def456ghij789");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("sk-or-");
    });
  });

  describe("Groq", () => {
    it("should accept valid Groq keys", () => {
      expect(validateKeyFormat("groq", "gsk_abc123def456ghij789klmnop").valid).toBe(true);
    });

    it("should reject keys without gsk_ prefix", () => {
      const result = validateKeyFormat("groq", "sk-abc123def456ghij789klmnop");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("gsk_");
    });
  });

  describe("xAI", () => {
    it("should accept valid xAI keys", () => {
      expect(validateKeyFormat("xai", "xai-abc123def456ghij789klmnop").valid).toBe(true);
    });

    it("should reject keys without xai- prefix", () => {
      const result = validateKeyFormat("xai", "sk-abc123def456ghij789klmnop");
      expect(result.valid).toBe(false);
    });
  });

  describe("DeepSeek", () => {
    it("should accept valid DeepSeek keys (sk- prefix)", () => {
      expect(validateKeyFormat("deepseek", "sk-abc123def456ghij789klmnop").valid).toBe(true);
    });
  });

  describe("Google Gemini", () => {
    it("should accept keys without prefix check (no prefix defined)", () => {
      expect(validateKeyFormat("google", "AIzaSyC-abc123def456ghij789").valid).toBe(true);
    });
  });

  describe("Mistral", () => {
    it("should accept keys without prefix check (no prefix defined)", () => {
      expect(validateKeyFormat("mistral", "abc123def456ghij789klmnop").valid).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should reject empty strings for all providers", () => {
      const providers = ["anthropic", "openai", "openrouter", "groq", "google", "xai", "mistral", "deepseek"];
      for (const provider of providers) {
        expect(validateKeyFormat(provider, "").valid).toBe(false);
      }
    });

    it("should reject whitespace-only strings", () => {
      const result = validateKeyFormat("openai", "   ");
      expect(result.valid).toBe(false);
    });

    it("should reject very short keys (even with correct prefix)", () => {
      const result = validateKeyFormat("openai", "sk-123");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too short");
    });

    it("should return error for unknown providers", () => {
      const result = validateKeyFormat("totally-unknown-provider", "any-key-here");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown provider");
    });
  });
});
