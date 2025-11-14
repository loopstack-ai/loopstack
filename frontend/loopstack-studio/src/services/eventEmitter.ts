class EventEmitter {
  private events: Record<string, Array<(...args: any[]) => void>> = {};

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);

    return () => {
      this.events[event] = this.events[event].filter((l) => l !== listener);
    };
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach((listener) => listener(...args));
    }
  }
}

export const eventBus = new EventEmitter();
