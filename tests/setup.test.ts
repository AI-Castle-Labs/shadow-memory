/**
 * Basic setup verification test
 */

import fc from 'fast-check';

describe('Project Setup', () => {
  test('TypeScript compilation works', () => {
    expect(true).toBe(true);
  });

  test('fast-check property testing works', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n; // Identity property
      })
    );
  });

  test('Jest configuration is working', () => {
    expect(jest).toBeDefined();
    expect(typeof jest.setTimeout).toBe('function');
  });
});