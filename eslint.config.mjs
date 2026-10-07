import { fileURLToPath } from 'node:url';
import angularConfigs from 'angular-eslint';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));
const { tsPlugin: angular, templatePlugin: angularTemplate, templateParser } = angularConfigs;

export default [
  {
    ignores: ['**/node_modules/**', 'dist/**', 'reports/**', 'functional-output/**']
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: ['tsconfig.json'],
        tsconfigRootDir: rootDirectory
      }
    },
    plugins: {
      '@angular-eslint': angular,
      '@angular-eslint/template': angularTemplate,
      '@typescript-eslint': typescript
    },
    processor: angularTemplate.processors['extract-inline-html'],
    rules: {
      ...Object.assign({}, ...angularConfigs.configs.tsRecommended.map((config) => config.rules)),
      '@angular-eslint/directive-selector': ['error', {
        type: 'attribute', prefix: 'app', style: 'camelCase'
      }],
      '@angular-eslint/component-selector': ['error', {
        type: 'element', prefix: ['app', 'media'], style: 'kebab-case'
      }],
      '@typescript-eslint/no-require-imports': 'off',
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      '@angular-eslint/prefer-standalone': 'off'
    }
  },
  {
    files: ['projects/media-viewer/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: [
          'projects/media-viewer/tsconfig.lib.json',
          'projects/media-viewer/tsconfig.spec.json'
        ]
      }
    },
    rules: {
      '@angular-eslint/directive-selector': ['error', {
        type: 'attribute', prefix: 'mv', style: 'camelCase'
      }],
      '@angular-eslint/component-selector': ['error', {
        type: 'element', prefix: 'mv', style: 'kebab-case'
      }]
    }
  },
  {
    files: ['**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { '@angular-eslint/template': angularTemplate },
    rules: {
      ...Object.assign({}, ...angularConfigs.configs.templateRecommended.map((config) => config.rules)),
      '@angular-eslint/template/prefer-control-flow': 'off'
    }
  }
];