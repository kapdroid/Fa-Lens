// {{name}} and {{a.b}} resolution. A template that is exactly one reference resolves to the raw value
// (so a fixture object stays an object); anything else is string substitution. Unresolved names are
// reported by name and never left in the text.

const WHOLE = /^\{\{\s*([A-Za-z_][\w-]*(?:\.[\w-]+)*)\s*\}\}$/;
const PART = /\{\{\s*([A-Za-z_][\w-]*(?:\.[\w-]+)*)\s*\}\}/g;

export type Bag = Record<string, unknown>;

function lookup(name: string, bag: Bag): { found: boolean; value: unknown } {
  let cur: unknown = bag;
  for (const part of name.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in (cur as Record<string, unknown>))) return { found: false, value: undefined };
    cur = (cur as Record<string, unknown>)[part];
  }
  return { found: true, value: cur };
}

/** Resolve every {{name}} inside a value (deeply). Missing names come back in `missing`. */
export function interpolate(value: unknown, bag: Bag, missing: string[] = []): { value: unknown; missing: string[] } {
  if (typeof value === 'string') {
    const whole = WHOLE.exec(value);
    if (whole?.[1]) {
      const { found, value: resolved } = lookup(whole[1], bag);
      if (!found) { missing.push(whole[1]); return { value, missing }; }
      return { value: resolved, missing };
    }
    const text = value.replace(PART, (_m, name: string) => {
      const { found, value: resolved } = lookup(name, bag);
      if (!found) { missing.push(name); return ''; }
      return typeof resolved === 'string' ? resolved : JSON.stringify(resolved) ?? '';
    });
    return { value: text, missing };
  }
  if (Array.isArray(value)) return { value: value.map(v => interpolate(v, bag, missing).value), missing };
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = interpolate(v, bag, missing).value;
    return { value: out, missing };
  }
  return { value, missing };
}
