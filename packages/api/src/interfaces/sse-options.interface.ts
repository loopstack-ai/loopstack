export const SSE_STREAM_OPTIONS = 'loopstack.api.sse-stream-options';

export interface SseStreamOptionsInterface {
  /**
   * Maximum number of events kept per connection key for reconnect replay.
   * Defaults to 1000.
   */
  bufferSize?: number;
  /**
   * Maximum age of buffered events in milliseconds. Older events are evicted
   * and can no longer be replayed. Defaults to 5 minutes.
   */
  bufferTtlMs?: number;
  /**
   * Interval between heartbeat frames in milliseconds, letting non-browser
   * clients detect dead connections. Defaults to 25 seconds.
   */
  heartbeatIntervalMs?: number;
}
