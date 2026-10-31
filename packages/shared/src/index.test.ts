import { describe, expect, it } from 'vitest';
import { appName } from './index.js';

describe('workspace entry point', () => {
  it('exports the application name', () => {
    expect(appName).toBe('Brightloop');
  });
});
