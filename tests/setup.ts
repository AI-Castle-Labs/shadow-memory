// Jest setup file for global test configuration
// This file is run before each test file
import 'dotenv/config';

// Configure fast-check for property-based testing
import fc from 'fast-check';

// Set default number of runs for property-based tests
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations as specified in design
  verbose: false,
  seed: 42 // For reproducible test runs
});

// Global test timeout
jest.setTimeout(30000);