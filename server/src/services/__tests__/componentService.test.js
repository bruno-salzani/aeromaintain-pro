import { describe, it, expect } from 'vitest';
import { computeRemainingHours } from '../componentService.js';

describe('componentService', () => {
  it('computes remaining hours', () => {
    expect(computeRemainingHours(1200, 1100, 1000)).toBe(1100);
    expect(computeRemainingHours(undefined, 1100, 1000)).toBeUndefined();
  });
});
