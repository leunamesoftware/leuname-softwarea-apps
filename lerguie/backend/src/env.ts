export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ENVIRONMENT: string;
  CLAUDE_MODEL: string;
  ANDROID_PACKAGE: string;
  /** Opcional: com a chave, usa Claude (pago); sem ela, usa Workers AI (grátis). */
  ANTHROPIC_API_KEY?: string;
  /** "free" (padrão, Workers AI) ou "anthropic". */
  AI_PROVIDER?: string;
  FREE_VISION_MODEL?: string;
  AI?: { run(model: string, inputs: Record<string, unknown>): Promise<unknown> };
  SESSION_SECRET: string;
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?: string;
  PLANS_JSON?: string;
  SESSION_LIMITER: RateLimiter;
  DESCRIBE_LIMITER: RateLimiter;
  USAGE?: KVNamespace;
}
