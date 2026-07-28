import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadConfig,
  resolveValue,
  getUserConfigPath,
  getKeysStorePath,
} from "../src/config/loader.js";

describe("Config Loader", () => {
  const testDir = join(tmpdir(), "byok-ai-test-config-" + Date.now());
  const originalCwd = process.cwd;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    // Override cwd to our test directory
    process.cwd = () => testDir;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.env = { ...originalEnv };
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("resolveValue", () => {
    it("should resolve {env:VAR_NAME} placeholders", () => {
      process.env.TEST_BYOK_KEY = "my-secret-key";
      expect(resolveValue("{env:TEST_BYOK_KEY}")).toBe("my-secret-key");
    });

    it("should return empty string for unset env vars", () => {
      delete process.env.NONEXISTENT_VAR_XYZ;
      expect(resolveValue("{env:NONEXISTENT_VAR_XYZ}")).toBe("");
    });

    it("should resolve {file:/path} placeholders", () => {
      const keyFile = join(testDir, "secret.txt");
      writeFileSync(keyFile, "  file-based-key  \n");
      expect(resolveValue(`{file:${keyFile}}`)).toBe("file-based-key");
    });

    it("should return empty string for nonexistent file", () => {
      expect(resolveValue("{file:/nonexistent/path/key.txt}")).toBe("");
    });

    it("should return plain strings unchanged", () => {
      expect(resolveValue("sk-ant-abc123")).toBe("sk-ant-abc123");
    });

    it("should not resolve partial env patterns", () => {
      process.env.FOO = "bar";
      expect(resolveValue("prefix-{env:FOO}-suffix")).toBe("prefix-{env:FOO}-suffix");
    });
  });

  describe("loadConfig from project files", () => {
    it("should load .byokrc.json from project root", () => {
      writeFileSync(
        join(testDir, ".byokrc.json"),
        JSON.stringify({
          defaultProvider: "anthropic",
          providers: {
            anthropic: { apiKey: "sk-ant-from-config-123" },
          },
        }),
      );

      const { config, sources } = loadConfig();
      expect(config.defaultProvider).toBe("anthropic");
      expect(config.providers?.anthropic?.apiKey).toBe("sk-ant-from-config-123");
      expect(sources).toContain("project-config");
    });

    it("should load byok.config.json from project root", () => {
      writeFileSync(
        join(testDir, "byok.config.json"),
        JSON.stringify({
          providers: {
            openai: { apiKey: "sk-from-byok-config" },
          },
        }),
      );

      const { config } = loadConfig();
      expect(config.providers?.openai?.apiKey).toBe("sk-from-byok-config");
    });

    it("should load byok field from package.json", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          byok: {
            defaultProvider: "openrouter",
            fallbackOrder: ["openrouter", "anthropic"],
          },
        }),
      );

      const { config } = loadConfig();
      expect(config.defaultProvider).toBe("openrouter");
      expect(config.fallbackOrder).toEqual(["openrouter", "anthropic"]);
    });

    it("should resolve env vars in config file apiKey values", () => {
      process.env.MY_ANTHROPIC_KEY = "sk-ant-resolved-from-env";
      writeFileSync(
        join(testDir, ".byokrc.json"),
        JSON.stringify({
          providers: {
            anthropic: { apiKey: "{env:MY_ANTHROPIC_KEY}" },
          },
        }),
      );

      const { config } = loadConfig();
      expect(config.providers?.anthropic?.apiKey).toBe("sk-ant-resolved-from-env");
    });

    it("should handle malformed JSON gracefully", () => {
      writeFileSync(join(testDir, ".byokrc.json"), "{ this is not valid json }");
      const { config, sources } = loadConfig();
      expect(sources).not.toContain("project-config");
      expect(config).toEqual({});
    });

    it("should return empty config when no files exist", () => {
      const { config, sources } = loadConfig();
      expect(config).toEqual({});
      expect(sources).toEqual([]);
    });

    it("should load from custom config path", () => {
      const customPath = join(testDir, "custom-byok.json");
      writeFileSync(
        customPath,
        JSON.stringify({
          providers: {
            groq: { apiKey: "gsk_custom-path-key" },
          },
        }),
      );

      const { config, sources } = loadConfig(customPath);
      expect(config.providers?.groq?.apiKey).toBe("gsk_custom-path-key");
      expect(sources).toContain("custom-config");
    });
  });

  describe("Config merging", () => {
    it("should merge project config over user config", () => {
      // Simulate two config sources by using project + custom
      const customPath = join(testDir, "user-config.json");
      writeFileSync(
        customPath,
        JSON.stringify({
          defaultProvider: "openai",
          providers: {
            openai: { apiKey: "sk-from-custom", baseUrl: "https://custom.api.com" },
            anthropic: { apiKey: "sk-ant-from-custom" },
          },
        }),
      );

      writeFileSync(
        join(testDir, ".byokrc.json"),
        JSON.stringify({
          defaultProvider: "anthropic",
          providers: {
            openai: { apiKey: "sk-from-project" },
          },
        }),
      );

      const { config } = loadConfig(customPath);
      // Custom (highest priority) overrides project
      expect(config.defaultProvider).toBe("openai");
      // Project config set openai key, but custom overrides it
      expect(config.providers?.openai?.apiKey).toBe("sk-from-custom");
      // baseUrl from custom is preserved
      expect(config.providers?.openai?.baseUrl).toBe("https://custom.api.com");
      // anthropic from custom is preserved
      expect(config.providers?.anthropic?.apiKey).toBe("sk-ant-from-custom");
    });

    it("should handle disabled providers", () => {
      writeFileSync(
        join(testDir, ".byokrc.json"),
        JSON.stringify({
          providers: {
            openai: { disabled: true },
          },
        }),
      );

      const { config } = loadConfig();
      expect(config.providers?.openai?.disabled).toBe(true);
    });
  });

  describe("Path helpers", () => {
    it("should return XDG-compliant user config path", () => {
      const path = getUserConfigPath();
      expect(path).toContain("byok-ai");
      expect(path).toContain("config.json");
    });

    it("should return XDG-compliant keys store path", () => {
      const path = getKeysStorePath();
      expect(path).toContain("byok-ai");
      expect(path).toContain("keys.json");
    });
  });
});
