import type { RenderOptions, SearchOptions, SearchResult, TextSpan } from '../types';
import { PDFWorker } from './PDFWorker';

interface PoolTask {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  execute: (worker: PDFWorker) => Promise<unknown>;
}

/**
 * Pool of PDFWorker instances for concurrent page rendering.
 * Distributes rendering tasks across multiple workers to maximize
 * throughput on multi-core machines.
 */
export class WorkerPool {
  private workers: PDFWorker[] = [];
  private queue: PoolTask[] = [];
  private activeCount: Map<PDFWorker, number> = new Map();
  private maxWorkers: number;
  private _initialized = false;
  private initOptions?: { wasmUrl?: string; tier?: 'lite' | 'full' };

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers ??
      (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 4 : 4);
  }

  async init(options?: { wasmUrl?: string; tier?: 'lite' | 'full' }): Promise<void> {
    if (this._initialized) return;
    this.initOptions = options;

    const count = Math.min(this.maxWorkers, 4); // Start with up to 4, expand on demand

    for (let i = 0; i < count; i++) {
      const worker = new PDFWorker();
      await worker.init(options);
      this.workers.push(worker);
      this.activeCount.set(worker, 0);
    }

    this._initialized = true;
  }

  get workerCount(): number {
    return this.workers.length;
  }

  get pendingTasks(): number {
    return this.queue.length;
  }

  async renderPage(pageIndex: number, options?: RenderOptions): Promise<ImageData> {
    return this._enqueue((worker) => worker.renderPage(pageIndex, options)) as Promise<ImageData>;
  }

  async getText(pageIndex: number): Promise<string> {
    return this._enqueue((worker) => worker.getText(pageIndex)) as Promise<string>;
  }

  async getTextSpans(pageIndex: number): Promise<TextSpan[]> {
    return this._enqueue((worker) => worker.getTextSpans(pageIndex)) as Promise<TextSpan[]>;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    return this._enqueue((worker) => worker.search(query, options)) as Promise<SearchResult[]>;
  }

  /**
   * Render multiple pages concurrently, returning results in order.
   */
  async renderPages(
    pageIndices: number[],
    options?: RenderOptions,
  ): Promise<ImageData[]> {
    const promises = pageIndices.map((idx) => this.renderPage(idx, options));
    return Promise.all(promises);
  }

  destroy(): void {
    for (const worker of this.workers) {
      worker.destroy();
    }
    this.workers = [];
    this.activeCount.clear();

    for (const task of this.queue) {
      task.reject(new Error('Worker pool destroyed'));
    }
    this.queue = [];
    this._initialized = false;
  }

  private _enqueue(execute: (worker: PDFWorker) => Promise<unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, execute });
      this._processQueue();
    });
  }

  private _processQueue(): void {
    if (this.queue.length === 0) return;

    const available = this._getLeastBusyWorker();
    if (!available) {
      this._maybeExpandPool();
      return;
    }

    const task = this.queue.shift()!;
    const count = this.activeCount.get(available) ?? 0;
    this.activeCount.set(available, count + 1);

    task
      .execute(available)
      .then((result) => {
        task.resolve(result);
      })
      .catch((err) => {
        task.reject(err);
      })
      .finally(() => {
        const c = this.activeCount.get(available) ?? 1;
        this.activeCount.set(available, c - 1);
        this._processQueue();
      });
  }

  private _getLeastBusyWorker(): PDFWorker | null {
    let best: PDFWorker | null = null;
    let bestCount = Infinity;

    for (const [worker, count] of this.activeCount) {
      if (count < bestCount) {
        bestCount = count;
        best = worker;
      }
    }

    // Only hand off if worker has < 2 active tasks
    return best && bestCount < 2 ? best : null;
  }

  private async _maybeExpandPool(): Promise<void> {
    if (this.workers.length >= this.maxWorkers) return;

    const worker = new PDFWorker();
    await worker.init(this.initOptions);
    this.workers.push(worker);
    this.activeCount.set(worker, 0);

    this._processQueue();
  }
}
