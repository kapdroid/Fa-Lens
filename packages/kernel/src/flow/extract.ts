import { JSONPath } from 'jsonpath-plus';

/** Read one JSONPath out of a document. Zero matches is `undefined`, never a throw. */
export function readPath(json: unknown, path: string): unknown {
  try {
    const result: unknown = JSONPath({ path, json: json as object, wrap: false });
    return result;
  } catch {
    return undefined;
  }
}
