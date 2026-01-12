import { createHash } from './create-hash.util';
import { normalizeDeepSerializeUtil } from './normalize-deep-serialize.util';

export const generateObjectFingerprint = (obj: Record<string, any>): string => {
  return createHash(normalizeDeepSerializeUtil(obj));
};
