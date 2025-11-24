import {normalizeDeepSerializeUtil} from "./normalize-deep-serialize.util";
import {createHash} from "./create-hash.util";

export const generateObjectFingerprint = (obj: Record<string, any>): string => {
  return createHash(normalizeDeepSerializeUtil(obj));
};