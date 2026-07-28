# byok-llm

Unified API key management for AI-powered apps. Zero dependencies.

Resolve, store, validate, and manage API keys across **8 AI providers** with a single interface. Built for CLI tools, agentic apps, and any Node.js project that needs to work with multiple AI services.

```bash
npm install byok-llm
```

## Why

Every AI-powered app needs API keys. Most hardcode `process.env.OPENAI_API_KEY` and call it a day. But real apps need:

- **Multiple providers** — Anthropic, OpenAI, Google, Groq, OpenRouter, xAI, Mistral, DeepSeek
- **Fallback chains** — if one provider is down, try the next
- **Key validation** — catch bad keys before they cause 401s at runtime
- **User setup** — a wizard that walks users through key configuration
- **Secure storage** — file permissions, never logged, XDG-compliant paths
- **No lock-in** — returns raw keys/headers/URLs, works with any HTTP client or SDK

`byok-ai` does all of this in a single zero-dependency package.

## Quick Start

```typescript
import { init } from 'byok-llm';

// Finds a configured provider, or runs the setup wizard
const provider = await init({
  providers: ['anthropic', 'openai', 'openrouter'],
  appName: 'my-cli-tool',
});

if (provider) {
  // provider.key, provider.headers, provider.baseUrl — ready to use
  const response = await fetch(`${provider.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: { ...provider.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Hello!' }],
    }),
  });
}
```

## Works with Any SDK

```typescript
import OpenAI from 'openai';
import { getOpenAICompatibleConfig } from 'byok-llm';

// Works with OpenRouter, Groq, xAI, Mistral, DeepSeek — anything OpenAI-compatible
const client = new OpenAI(await getOpenAICompatibleConfig('groq'));
```

## Key Resolution

Keys are resolved from multiple sources, highest priority first:

1. **Runtime options** — passed directly in code
2. **Environment variables** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.
3. **Project config** — `.byokrc.json`, `.byokrc`, `byok.config.json`, or `byok` field in `package.json`
4. **User config** — `~/.config/byok-ai/config.json`
5. **Stored keys** — `~/.config/byok-ai/keys.json` (0600 permissions)

```typescript
import { resolveKey } from 'byok-llm';

const key = await resolveKey('anthropic');
// Checks all layers, returns { key, source, providerId } or null
```

## Fallback Chains

Try multiple providers in order, use the first one with a valid key:

```typescript
import { resolveWithFallback } from 'byok-llm';

const provider = await resolveWithFallback(['anthropic', 'openai', 'openrouter']);
// Returns the first provider that has a key configured
```

## Key Validation

Validate keys before using them — format check + live API ping:

```typescript
import { validateKey } from 'byok-llm';

const result = await validateKey('openai', 'sk-...');
// { valid: true } or { valid: false, error: 'Invalid key format' }
```

Validation is lightweight (hits `/v1/models` or equivalent), times out after 10 seconds, and gracefully falls back to format-only checks if the network is unreachable.

## Setup Wizard

Interactive terminal wizard for first-run key configuration:

```typescript
import { setupWizard } from 'byok-llm';

await setupWizard({
  providers: ['anthropic', 'openai', 'openrouter'],
  required: ['anthropic'],
  appName: 'my-app',
});
```

The wizard shows already-configured providers, links to docs for getting keys, validates on entry, and stores keys securely.

## Config Files

Create a `.byokrc.json` in your project:

```json
{
  "defaultProvider": "anthropic",
  "fallbackOrder": ["anthropic", "openai", "groq"],
  "providers": {
    "anthropic": {
      "apiKey": "{env:MY_ANTHROPIC_KEY}"
    },
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  }
}
```

Values support `{env:VAR_NAME}` and `{file:/path/to/key}` placeholders.

## Custom Providers

Register any OpenAI-compatible or custom provider:

```typescript
import { registerProvider, resolveKey } from 'byok-llm';

registerProvider({
  id: 'my-ollama',
  name: 'Local Ollama',
  envKeys: ['OLLAMA_API_KEY'],
  baseUrl: 'http://localhost:11434',
  docsUrl: 'https://ollama.ai',
  authStyle: 'bearer',
  openaiCompatible: true,
});

const key = await resolveKey('my-ollama');
```

## Status Report

Check which providers are configured:

```typescript
import { printStatus } from 'byok-llm';

await printStatus();
// Prints a colored table of all providers and their status
```

## Secure Storage

Keys stored via the wizard or `storeKey()` go to `~/.config/byok-ai/keys.json` with **0600 file permissions** (owner read/write only). The directory is created with 0700 permissions. Keys are never logged.

```typescript
import { storeKey, getKey, removeKey } from 'byok-llm';

await storeKey('anthropic', 'sk-ant-...');
const key = await getKey('anthropic');
await removeKey('anthropic');
```

## Built-in Providers

| Provider | ID | Env Variable | Auth Style |
|----------|-----|-------------|------------|
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | `x-api-key` |
| OpenAI | `openai` | `OPENAI_API_KEY` | `bearer` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` | `bearer` |
| Google Gemini | `google` | `GOOGLE_API_KEY` | `query-param` |
| Groq | `groq` | `GROQ_API_KEY` | `bearer` |
| xAI | `xai` | `XAI_API_KEY` | `bearer` |
| Mistral | `mistral` | `MISTRAL_API_KEY` | `bearer` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` | `bearer` |

All providers except Anthropic and Google are OpenAI-SDK-compatible.

## API Reference

### Initialization
- **`init(options?)`** — All-in-one: load config, resolve key, run wizard if needed
- **`initConfig(options?)`** — Initialize config cache manually

### Key Resolution
- **`resolveKey(provider, runtimeKey?)`** — Resolve a key from all layers
- **`resolveWithFallback(providers?)`** — Try providers in order, return first match
- **`getConfiguredProviders()`** — List all providers with keys configured

### Validation
- **`validateKey(provider, key)`** — Format check + API ping
- **`validateKeyFormat(provider, key)`** — Format check only
- **`validateAllKeys()`** — Validate all configured keys

### Storage
- **`storeKey(provider, key)`** — Store a key securely
- **`getKey(provider)`** — Retrieve a stored key
- **`removeKey(provider)`** — Delete a stored key
- **`listStoredKeys()`** — List all stored provider IDs
- **`clearAllKeys()`** — Delete all stored keys

### Integration Helpers
- **`getProviderHeaders(provider)`** — Get auth headers for a provider
- **`getProviderBaseUrl(provider)`** — Get the base URL
- **`getOpenAICompatibleConfig(provider)`** — Get `{ apiKey, baseURL }` for the OpenAI SDK

### Provider Registry
- **`registerProvider(definition)`** — Register a custom provider
- **`getProvider(id)`** — Get a provider definition
- **`listProviders()`** — List all registered providers
- **`hasProvider(id)`** — Check if a provider is registered

### Environment
- **`hasEnvKey(provider)`** — Check if an env var is set
- **`getEnvKey(provider)`** — Get the env var value
- **`getEnvVarName(provider)`** — Get the primary env var name
- **`generateEnvTemplate(providers?)`** — Generate a `.env` template

### UI
- **`setupWizard(options?)`** — Run the interactive setup wizard
- **`getStatus(providers?)`** — Get provider statuses as data
- **`printStatus(providers?)`** — Print colored status to terminal

## License

MIT
