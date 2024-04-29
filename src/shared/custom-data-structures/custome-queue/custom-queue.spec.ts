import { Test, TestingModule } from '@nestjs/testing';
import { CustomQueue } from './custom-queue';

describe('CustomQueue', () => {
  let queue: CustomQueue<number>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomQueue],
    }).compile();

    queue = module.get<CustomQueue<number>>(CustomQueue);
  });

  it('should create a queue with a maximum size of 5 and enqueue items', () => {
    queue.setMaxSize(5);
    expect(queue.size()).toEqual(0);
    expect(queue.isEmpty()).toEqual(true);
    expect(queue.isFull()).toEqual(false);

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    queue.enqueue(4);
    queue.enqueue(5);

    expect(queue.size()).toEqual(5);
    expect(queue.isFull()).toEqual(true);
  });

  it('should dequeue items', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    expect(queue.dequeue()).toEqual(1);
    expect(queue.size()).toEqual(2);
    expect(queue.peek()).toEqual(2);
  });

  it('should update maximum size and dequeue excess items', () => {
    queue.setMaxSize(5);

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    queue.enqueue(4);
    queue.enqueue(5);

    expect(queue.size()).toEqual(5);
    expect(queue.isFull()).toEqual(true);

    queue.setMaxSize(3);

    expect(queue.size()).toEqual(3);
    expect(queue.peek()).toEqual(3);
  });

  it('should slice the queue correctly', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    queue.enqueue(4);
    queue.enqueue(5);

    // Test slicing the whole queue
    expect(queue.slice()).toEqual([1, 2, 3, 4, 5]);

    expect(queue.slice(1, 4)).toEqual([2, 3, 4]);

    expect(queue.slice(0, 3)).toEqual([1, 2, 3]);

    // Test slicing from index 3 to end of queue
    expect(queue.slice(3)).toEqual([4, 5]);
  });
});
