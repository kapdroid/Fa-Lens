// ESLint flat config (ADR-0011 static gate). Tokens-only Stylelint arrives with the ui package (ADR-0007).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '.turbo/**', '.claude/**', 'docs/**', 'evidence/**', 'tool/**', 'packs/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.ts', '**/*.tsx'], rules: { '@typescript-eslint/consistent-type-imports': 'error' } },
);
