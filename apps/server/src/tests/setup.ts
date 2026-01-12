/**
 * Test setup file
 * Loads environment variables and performs any necessary test initialization
 */

import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import path from 'path';

// Set NODE_ENV to test before loading env
process.env.NODE_ENV = 'test';

// Load environment variables from .env.test file
const envConfig = dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });
expand(envConfig);

// Ensure BASE_URL is set (fallback if not in .env.test)
if (!process.env.BASE_URL) {
  process.env.BASE_URL = 'http://localhost:3000';
}

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: () => {},
//   debug: () => {},
//   info: () => {},
// };
