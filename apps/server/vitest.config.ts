import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Load environment variables from .env.test file for tests
const envConfig = dotenv.config({ path: path.resolve(__dirname, '.env.test') });
expand(envConfig);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/db': path.resolve(__dirname, './src/db'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
});
