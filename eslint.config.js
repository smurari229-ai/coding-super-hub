// ESLint flat-config baseline. TypeScript type-checking remains the authoritative lint gate
// until @typescript-eslint/parser/plugin are added to the locked dependency set.
export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.vercel/**'],
    rules: {
      'no-console': 'off',
      'no-debugger': 'error',
    },
  },
];
