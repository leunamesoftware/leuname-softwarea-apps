export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ENVIRONMENT: string;
  CLAUDE_MODEL: string;
  ANDROID_PACKAGE: string;
  ANTHROPIC_API_KEY: string;
  SESSION_SECRET: string;
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?: string;
  PLANS_JSON?: string;
  SESSION_LIMITER: RateLimiter;
  DESCRIBE_LIMITER: RateLimiter;
  USAGE?: KVNamespace;
}
