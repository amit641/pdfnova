import { describe, it, expect } from 'vitest';
import { WorkerPool } from '../src/worker/WorkerPool';

describe('WorkerPool', () => {
  it('creates with default worker count', () => {
    const pool = new WorkerPool();
    expect(pool.workerCount).toBe(0); // not initialized yet
    expect(pool.pendingTasks).toBe(0);
  });

  it('creates with custom worker count', () => {
    const pool = new WorkerPool(2);
    expect(pool.workerCount).toBe(0);
  });

  it('destroy is safe to call before init', () => {
    const pool = new WorkerPool();
    expect(() => pool.destroy()).not.toThrow();
  });
});
