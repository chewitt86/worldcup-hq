import { describe, expect, test } from 'vitest';
import { flagCss } from './flags';

describe('flagCss', () => {
  test('vertical bands → 90deg gradient', () => {
    expect(flagCss('MEX')).toMatch(/^linear-gradient\(90deg/);
  });

  test('horizontal bands → 180deg gradient', () => {
    expect(flagCss('BRA')).toMatch(/^linear-gradient\(180deg/);
  });

  test('centre bands → radial gradient', () => {
    expect(flagCss('JPN')).toMatch(/^radial-gradient/);
  });

  test('cross bands → SVG data-URI', () => {
    expect(flagCss('ENG')).toContain('data:image/svg+xml');
  });

  test('unknown code → grey', () => {
    expect(flagCss('ZZZ')).toBe('#ccc');
  });
});
