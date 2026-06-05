// Centralized, lazily-validated access to environment variables.
// We avoid throwing at import time so `next build` works without a full env.

export const env = {
  get databaseUrl(): string | undefined {
    return process.env.DATABASE_URL;
  },
  get redisUrl(): string {
    return process.env.REDIS_URL ?? "redis://localhost:6379";
  },
  get tbaAuthKey(): string | undefined {
    return process.env.TBA_AUTH_KEY;
  },
  get statboticsBaseUrl(): string {
    return process.env.STATBOTICS_BASE_URL ?? "https://api.statbotics.io/v3";
  },
  get tbaBaseUrl(): string {
    return process.env.TBA_BASE_URL ?? "https://www.thebluealliance.com/api/v3";
  },
  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get sessionSecret(): string {
    return process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";
  },
  get currentEventKey(): string | undefined {
    return process.env.CURRENT_EVENT_KEY;
  },
  // AI is disabled by default in v1. Flip AI_ENABLED=true and set a provider key to activate.
  get aiEnabled(): boolean {
    return process.env.AI_ENABLED === "true";
  },
  get aiProvider():
    | "anthropic"
    | "openai"
    | "deepseek"
    | "nvidia"
    | "ollama"
    | "none" {
    const p = process.env.AI_PROVIDER;
    if (
      p === "anthropic" ||
      p === "openai" ||
      p === "deepseek" ||
      p === "nvidia" ||
      p === "ollama"
    )
      return p;
    return "none";
  },
  get isProd(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
