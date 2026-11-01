import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

const tsRecommended = tseslint.configs.recommended.map((cfg) => ({
  ...cfg,
  files: ['**/*.{ts,tsx}'],
}));

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'public/**',
      '.firebase/**',
    ],
  },
  ...tsRecommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'jsx-a11y/label-has-associated-control': [
        'error',
        {
          assert: 'either',
          depth: 3,
        },
      ],
    },
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
