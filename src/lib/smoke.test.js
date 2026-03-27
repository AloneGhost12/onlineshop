import { describe, expect, it } from 'vitest';

describe('frontend smoke test', () => {
  it('confirms test setup is working', () => {
    expect('shopvault'.toUpperCase()).toBe('SHOPVAULT');
  });
});
