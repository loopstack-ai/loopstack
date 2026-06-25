import { fileURLToPath } from 'node:url';

/**
 * Returns the absolute file path of the caller of the function that called `getCallerFile`.
 *
 * Reads the V8 structured stack via `Error.captureStackTrace` + `Error.prepareStackTrace`,
 * so it returns the runtime `.js` path even when `source-map-support` is installed (we
 * restore `prepareStackTrace` synchronously before any consumer can intercept it).
 *
 * Frame 0 is `getCallerFile` itself (skipped via `Error.captureStackTrace`'s second arg).
 * Frame 1 is the immediate caller. The default `skipFrames = 1` walks one further frame
 * up, so the typical usage is "tell me which file called the function that called me."
 *
 * Cross-platform handling: V8 returns `file://` URLs for ESM frames and native OS paths
 * for CJS frames. We use `fileURLToPath` so Windows drive letters (`C:\…`) come out
 * correctly instead of as `/C:/…`.
 *
 * @param skipFrames How many additional frames to skip past the immediate caller. Default 1.
 */
export function getCallerFile(skipFrames = 1): string {
  const originalPrepare = Error.prepareStackTrace;
  Error.prepareStackTrace = (_err, stack) => stack;
  const holder: { stack?: NodeJS.CallSite[] } = {};
  Error.captureStackTrace(holder as object, getCallerFile);
  const frames = holder.stack ?? [];
  Error.prepareStackTrace = originalPrepare;

  const frame = frames[skipFrames];
  const fileName = frame?.getFileName?.();
  if (!fileName) {
    throw new Error(
      `getCallerFile: could not resolve caller file at frame ${skipFrames}. ` +
        `Stack had ${frames.length} frames. This is likely a bundler or runtime environment issue.`,
    );
  }
  return fileName.startsWith('file://') ? fileURLToPath(fileName) : fileName;
}
