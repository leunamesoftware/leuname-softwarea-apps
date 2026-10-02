import type { Role } from './jwt';

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  REQUIRE_SUBSCRIPTION: string;
  /** Pacote do app na Play (ex.: com.leunamesoftwares.eclud). */
  PLAY_PACKAGE_NAME: string;
  /** JSON da conta de serviço com acesso à Google Play Developer API. */
  GOOGLE_SERVICE_ACCOUNT?: string;
  /** Segredo na URL das notificações em tempo real da Play (Pub/Sub). */
  PLAY_RTDN_TOKEN?: string;
  /** Envio de e-mail (Resend). Sem chave, os códigos só vão para o log. */
  RESEND_API_KEY?: string;
  EMAIL_FROM: string;
}

export interface AuthUser {
  id: string;
  role: Role;
}

export type AppEnv = { Bindings: Env; Variables: { user: AuthUser } };
