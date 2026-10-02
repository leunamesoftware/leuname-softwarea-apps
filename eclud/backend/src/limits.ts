// Limite de tentativas guardado no D1: após N erros, bloqueia por um tempo.

export interface LimitStatus {
  locked: boolean;
  retryAfterSeconds: number;
}

export class AttemptLimiter {
  constructor(
    private db: D1Database,
    private maxFailures: number,
    private lockSeconds: number,
  ) {}

  async check(key: string): Promise<LimitStatus> {
    const row = await this.db
      .prepare('SELECT locked_until FROM attempt_limits WHERE key = ?')
      .bind(key)
      .first<{ locked_until: string | null }>();
    const until = row?.locked_until ? Date.parse(row.locked_until) : 0;
    const remaining = Math.ceil((until - Date.now()) / 1000);
    return remaining > 0 ? { locked: true, retryAfterSeconds: remaining } : { locked: false, retryAfterSeconds: 0 };
  }

  /** Registra um erro; devolve quantas tentativas restam (0 = bloqueado). */
  async fail(key: string): Promise<number> {
    const row = await this.db
      .prepare(
        `INSERT INTO attempt_limits (key, failures) VALUES (?, 1)
         ON CONFLICT(key) DO UPDATE SET failures = failures + 1
         RETURNING failures`,
      )
      .bind(key)
      .first<{ failures: number }>();
    const failures = row?.failures ?? 1;
    if (failures >= this.maxFailures) {
      const until = new Date(Date.now() + this.lockSeconds * 1000).toISOString();
      await this.db
        .prepare('UPDATE attempt_limits SET failures = 0, locked_until = ? WHERE key = ?')
        .bind(until, key)
        .run();
      return 0;
    }
    return this.maxFailures - failures;
  }

  async reset(key: string): Promise<void> {
    await this.db.prepare('DELETE FROM attempt_limits WHERE key = ?').bind(key).run();
  }
}
