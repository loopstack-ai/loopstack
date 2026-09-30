import { describe, expect, it } from 'vitest';
import * as schemas from '../schemas/index.js';
import * as api from './index.js';

describe('@loopstack/contracts subpath exports', () => {
  it('gives every schema name a single meaning across /api and /schemas', () => {
    const shared = Object.keys(api).filter((name) => name in schemas);
    expect(shared).toEqual([]);
  });
});
