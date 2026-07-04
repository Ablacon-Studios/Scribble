/**
 * Jest setup file — runs before each test suite.
 *
 * Note: @testing-library/jest-dom must be imported in individual test files
 * because it requires the `expect` global which is only available in the
 * test environment, not during setupFiles execution.
 */

// Mock the HTMLCanvasElement.getContext and related APIs for all tests
require('jest-canvas-mock');
