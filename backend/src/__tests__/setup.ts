/**
 * Jest Test Setup
 * Configure test environment and global mocks
 */

// Set test environment BEFORE config is loaded
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// resetConfig ile her test suite arasında config cache temizlenir.
// setConfigForTest ile bireysel testlerde kısmi override yapılabilir.
// Örnek:
//   import { setConfigForTest, resetConfig } from '../config/env';
//   beforeEach(() => setConfigForTest({ auth: { jwtSecret: 'custom', tokenExpiresIn: '1h' } }));
//   afterEach(() => resetConfig());
import { resetConfig } from '../config/env';

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeAll(() => {
  // Optionally silence console during tests
  // Uncomment if you want to suppress console output
  // console.log = jest.fn();
  // console.info = jest.fn();
  // console.warn = jest.fn();
  // console.error = jest.fn();
});

afterAll(() => {
  // Restore original console
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(10000);

// Clear all mocks after each test; reset config cache
afterEach(() => {
  jest.clearAllMocks();
  resetConfig();
});

