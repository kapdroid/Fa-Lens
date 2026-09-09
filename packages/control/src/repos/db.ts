// One pool per process. The control plane is the only database FA Lens writes to (ADR-0004);
// source databases are reached by adapters, from workers, read-only.
import { Pool } from 'pg';

export function controlPool(connectionString: string = process.env['DATABASE_URL'] ?? 'postgres://falens:falens@localhost:5432/falens'): Pool {
  return new Pool({ connectionString, max: 10 });
}
