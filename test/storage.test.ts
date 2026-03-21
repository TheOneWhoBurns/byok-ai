import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, statSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { storeKey, getKey, removeKey, listStoredKeys, clearAllKeys } from "../src/storage/file.js";

describe("File Storage", () => {
  const testDir = join(tmpdir(), "byok-ai-test-storage-" + Date.now());
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    // Override XDG_CONFIG_HOME to isolate test storage
    process.env.XDG_CONFIG_HOME = testDir;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("storeKey / getKey", () => {
    it("should store and retrieve a key", async () => {
      await storeKey("anthropic", "sk-ant-stored-key-123456");
      const key = await getKey("anthropic");
      expect(key).toBe("sk-ant-stored-key-123456");
    });

    it("should store keys for multiple providers", async () => {
      await storeKey("anthropic", "sk-ant-multi-key-123456");
      await storeKey("openai", "sk-openai-multi-key-12345");
      await storeKey("groq", "gsk_groq-multi-key-12345678");

      expect(await getKey("anthropic")).toBe("sk-ant-multi-key-123456");
      expect(await getKey("openai")).toBe("sk-openai-multi-key-12345");
      expect(await getKey("groq")).toBe("gsk_groq-multi-key-12345678");
    });

    it("should overwrite existing keys", async () => {
      await storeKey("anthropic", "sk-ant-old-key-1234567890");
      await storeKey("anthropic", "sk-ant-new-key-1234567890");
      const key = await getKey("anthropic");
      expect(key).toBe("sk-ant-new-key-1234567890");
    });

    it("should return null for non-stored providers", async () => {
      const key = await getKey("openai");
      expect(key).toBeNull();
    });

    it("should create the config directory if it doesn't exist", async () => {
      const nestedDir = join(testDir, "deep", "nested");
      process.env.XDG_CONFIG_HOME = nestedDir;

      await storeKey("openai", "sk-nested-dir-key-123456");
      const key = await getKey("openai");
      expect(key).toBe("sk-nested-dir-key-123456");
      expect(existsSync(join(nestedDir, "byok-ai"))).toBe(true);
    });

    it("should write files with 0600 permissions", async () => {
      await storeKey("anthropic", "sk-ant-perms-key-1234567");

      const keysPath = join(testDir, "byok-ai", "keys.json");
      const stats = statSync(keysPath);
      // 0600 in octal = 384 in decimal, mode includes file type bits
      const permissions = stats.mode & 0o777;
      expect(permissions).toBe(0o600);
    });

    it("should store keys as valid JSON", async () => {
      await storeKey("anthropic", "sk-ant-json-key-12345678");
      await storeKey("openai", "sk-openai-json-key-1234567");

      const keysPath = join(testDir, "byok-ai", "keys.json");
      const raw = readFileSync(keysPath, "utf-8");
      const parsed = JSON.parse(raw);

      expect(parsed).toEqual({
        anthropic: "sk-ant-json-key-12345678",
        openai: "sk-openai-json-key-1234567",
      });
    });
  });

  describe("removeKey", () => {
    it("should remove a stored key", async () => {
      await storeKey("anthropic", "sk-ant-remove-me-1234567");
      expect(await getKey("anthropic")).toBe("sk-ant-remove-me-1234567");

      await removeKey("anthropic");
      expect(await getKey("anthropic")).toBeNull();
    });

    it("should not affect other keys when removing one", async () => {
      await storeKey("anthropic", "sk-ant-keep-me-12345678");
      await storeKey("openai", "sk-openai-keep-me-123456");

      await removeKey("anthropic");
      expect(await getKey("anthropic")).toBeNull();
      expect(await getKey("openai")).toBe("sk-openai-keep-me-123456");
    });

    it("should handle removing non-existent keys gracefully", async () => {
      await expect(removeKey("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("listStoredKeys", () => {
    it("should list all stored provider IDs", async () => {
      await storeKey("anthropic", "sk-ant-list-key-123456789");
      await storeKey("openai", "sk-openai-list-key-1234567");
      await storeKey("groq", "gsk_groq-list-key-123456789");

      const keys = await listStoredKeys();
      expect(keys).toContain("anthropic");
      expect(keys).toContain("openai");
      expect(keys).toContain("groq");
      expect(keys.length).toBe(3);
    });

    it("should return empty array when no keys stored", async () => {
      const keys = await listStoredKeys();
      expect(keys).toEqual([]);
    });
  });

  describe("clearAllKeys", () => {
    it("should remove all stored keys", async () => {
      await storeKey("anthropic", "sk-ant-clear-key-12345678");
      await storeKey("openai", "sk-openai-clear-key-123456");

      await clearAllKeys();

      expect(await getKey("anthropic")).toBeNull();
      expect(await getKey("openai")).toBeNull();
      expect(await listStoredKeys()).toEqual([]);
    });
  });
});
