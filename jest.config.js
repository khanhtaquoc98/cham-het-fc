// Polyfills for Node 16 - must load before next/jest
require('./jest.globalSetup.js');

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts(x)?', '**/*.test.ts(x)?'],
};

module.exports = createJestConfig(config);
