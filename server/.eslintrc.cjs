module.exports = {
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:n/recommended', 'plugin:promise/recommended', 'prettier'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
