import { describe, it, expect } from 'vitest';
import { PATH_LENGTH } from '../src/scroll/path';

describe('smoke', () => {
  it('PATH_LENGTH is 240', () => expect(PATH_LENGTH).toBe(240));
});
