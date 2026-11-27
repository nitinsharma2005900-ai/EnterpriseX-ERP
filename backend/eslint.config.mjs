import tseslint from 'typescript-eslint';
export default [{ ignores: ['dist/**','node_modules/**'] }, {
  files: ['src/**/*.ts', 'tests/**/*.ts'],
  languageOptions: { parser: tseslint.parser },
  plugins: { '@typescript-eslint': tseslint.plugin },
  rules: { 'no-eval': 'error', 'no-unreachable': 'error', 'no-constant-condition': 'error', 'no-async-promise-executor': 'error', 'no-dupe-else-if': 'error', 'no-loss-of-precision': 'error', '@typescript-eslint/no-duplicate-enum-values': 'error' }
}];
