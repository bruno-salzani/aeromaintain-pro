import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'html'],
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70
    }
  }
});
