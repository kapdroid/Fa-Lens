export type PackFileKind = 'manifest' | 'flow' | 'rule' | 'case' | 'fixture' | 'drilldown' | 'presets' | 'catalogRefs' | 'knowledge';

export interface Problem {
  /** `<file path>#<json pointer>` for document problems, or the bare file path for file-level problems. */
  path: string;
  message: string;
}

export interface PackFile {
  path: string;
  kind: PackFileKind;
  /** Parsed document (YAML or JSON) or, for knowledge notes, the raw text. */
  doc: unknown;
}

export interface Pack {
  manifest: Record<string, unknown> | null;
  files: PackFile[];
}
