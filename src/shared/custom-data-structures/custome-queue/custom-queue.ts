export class CustomQueue<T> {
  private queue: T[];
  private maxSize: number | undefined;

  constructor(maxSize?: number) {
    if (maxSize !== undefined && maxSize <= 0) {
      throw new Error('Maximum size must be greater than zero.');
    }
    this.queue = [];
    this.maxSize = maxSize;
  }

  enqueue(item: T): void {
    if (this.maxSize !== undefined && this.queue.length === this.maxSize) {
      this.dequeue(); // Remove oldest item if queue is full
    }
    this.queue.push(item);
  }

  dequeue(): T | undefined {
    return this.queue.shift();
  }

  peek(): T | undefined {
    return this.queue.length > 0 ? this.queue[0] : undefined;
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  isFull(): boolean {
    return this.size() === this.maxSize;
  }

  getMaxSize(): number | undefined {
    return this.maxSize;
  }

  setMaxSize(newMaxSize: number | undefined): void {
    if (newMaxSize !== undefined && newMaxSize <= 0) {
      throw new Error('Maximum size must be greater than zero.');
    }
    this.maxSize = newMaxSize;
    if (newMaxSize === undefined) return;
    while (this.queue.length > newMaxSize) {
      this.dequeue();
    }
  }

  slice(start?: number, end?: number): T[] {
    try {
      const slicedQueue = this.queue.slice(start, end);
      return slicedQueue;
    } catch (error: any) {
      const errorMsg: string = `${error.message}. Keep in mind queue max size is ${this.maxSize}`;
      throw new Error(errorMsg);
    }
  }
}
