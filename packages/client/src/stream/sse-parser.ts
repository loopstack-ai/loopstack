export interface SseFrame {
  id?: string;
  event?: string;
  data: string;
}

/**
 * Incremental server-sent-events parser. Feed it raw text chunks (which may
 * split frames or even lines arbitrarily); it emits one {@link SseFrame} per
 * dispatched event. Comment lines (`: ...`) are ignored.
 */
export function createSseParser(onFrame: (frame: SseFrame) => void) {
  let buffer = '';
  let dataLines: string[] = [];
  let eventType: string | undefined;
  let eventId: string | undefined;

  function dispatch() {
    if (dataLines.length > 0 || eventType !== undefined || eventId !== undefined) {
      onFrame({ id: eventId, event: eventType, data: dataLines.join('\n') });
    }
    dataLines = [];
    eventType = undefined;
    eventId = undefined;
  }

  function processLine(line: string) {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) return;

    const colonIndex = line.indexOf(':');
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    switch (field) {
      case 'data':
        dataLines.push(value);
        break;
      case 'event':
        eventType = value;
        break;
      case 'id':
        // Per spec, ids containing NUL are ignored.
        if (!value.includes('\0')) eventId = value;
        break;
    }
  }

  return {
    feed(chunk: string) {
      buffer += chunk;
      // Normalize CRLF/CR line endings, but never split a trailing '\r' that
      // might be the first half of a CRLF still in flight.
      let newlineIndex: number;
      while ((newlineIndex = buffer.search(/\r\n|\n|\r/)) !== -1) {
        const isCr = buffer[newlineIndex] === '\r';
        if (isCr && newlineIndex === buffer.length - 1) return;
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + (isCr && buffer[newlineIndex + 1] === '\n' ? 2 : 1));
        processLine(line);
      }
    },
  };
}
