import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { generateKeyPairSync } from 'node:crypto';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations');
  // Conta de serviço falsa (chave gerada na hora) para testar a Play.
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const serviceAccount = JSON.stringify({
    client_email: 'teste@eclud.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  });
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            JWT_SECRET: 'test-secret-only-for-tests',
            ENVIRONMENT: 'test',
            REQUIRE_SUBSCRIPTION: 'true',
            GOOGLE_SERVICE_ACCOUNT: serviceAccount,
            PLAY_RTDN_TOKEN: 'rtdn-secret',
          },
        },
      }),
    ],
    test: { setupFiles: ['./test/setup.ts'] },
  };
});
