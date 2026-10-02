import type { Role } from './jwt';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  REQUIRE_SUBSCRIPTION: string;
}

export interface AuthUser {
  id: string;
  role: Role;
}

export type AppEnv = { Bindings: Env; Variables: { user: AuthUser } };
