/**
 * Jest configuration for Scribble client tests.
 * Uses .cjs extension because package.json has "type": "module".
 */
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
    // Mock CSS imports (Tailwind directives, CSS modules)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock image/svg imports
    '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/src/__mocks__/fileMock.cjs',
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.cjs' }],
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx)',
    '**/*.(test|spec).(js|jsx)',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  // node_modules that need transformation (ESM packages)
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
};
