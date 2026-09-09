// The service's own failure shape. The kernel has a Problem too, but its path is a JSON pointer into a
// pack; this one names a field of a request and carries a code a skin can map to a status or an exit code.
export interface ServiceProblem {
  code: 'invalid_input' | 'invalid_output' | 'unknown_verb' | 'not_found' | 'failed';
  message: string;
  field?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; problem: ServiceProblem };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const problem = <T>(p: ServiceProblem): Result<T> => ({ ok: false, problem: p });
