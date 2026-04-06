import type { RenderOptions, SearchOptions, SearchResult, TextSpan } from '../types';
import type { WorkerEnvelope, WorkerResponseMessage } from './messages';

/**
 * Web Worker wrapper for off-main-thread PDF operations.
 * Communicates with a dedicated worker that runs the WASM module.
 */
export class PDFWorker {
  private worker: Worker | null = null;
  private nextId = 0;
  private pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }>();
  private _ready = false;

  async init(options?: { wasmUrl?: string; tier?: 'lite' | 'full' }): Promise<void> {
    if (this.worker) return;

    const workerCode = this._getWorkerScript();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    this.worker = new Worker(url, { type: 'module' });
    URL.revokeObjectURL(url);

    this.worker.onmessage = (e: MessageEvent<WorkerResponseMessage>) => {
      const msg = e.data;
      const handler = this.pending.get(msg.id);
      if (!handler) return;
      this.pending.delete(msg.id);

      if (msg.type === 'error') {
        handler.reject(new Error(msg.message));
      } else {
        handler.resolve(msg.data);
      }
    };

    this.worker.onerror = (e) => {
      for (const [, handler] of this.pending) {
        handler.reject(new Error(`Worker error: ${e.message}`));
      }
      this.pending.clear();
    };

    await this._send({
      type: 'init',
      wasmUrl: options?.wasmUrl,
      tier: options?.tier ?? 'lite',
    });

    this._ready = true;
  }

  get ready(): boolean {
    return this._ready;
  }

  async openDocument(data: ArrayBuffer, password?: string): Promise<{ pageCount: number }> {
    return this._send({ type: 'open', data, password }, [data]) as Promise<{ pageCount: number }>;
  }

  async renderPage(pageIndex: number, options?: RenderOptions): Promise<ImageData> {
    const result = await this._send({ type: 'render', pageIndex, options }) as {
      data: ArrayBuffer;
      width: number;
      height: number;
    };
    return new ImageData(
      new Uint8ClampedArray(result.data),
      result.width,
      result.height,
    );
  }

  async getText(pageIndex: number): Promise<string> {
    return this._send({ type: 'getText', pageIndex }) as Promise<string>;
  }

  async getTextSpans(pageIndex: number): Promise<TextSpan[]> {
    return this._send({ type: 'getTextSpans', pageIndex }) as Promise<TextSpan[]>;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    return this._send({ type: 'search', query, options }) as Promise<SearchResult[]>;
  }

  async closeDocument(): Promise<void> {
    await this._send({ type: 'closeDoc' });
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this._ready = false;
    for (const [, handler] of this.pending) {
      handler.reject(new Error('Worker destroyed'));
    }
    this.pending.clear();
  }

  private _send(
    request: import('./messages').WorkerRequestMessage,
    transfer?: ArrayBuffer[],
  ): Promise<unknown> {
    if (!this.worker) throw new Error('Worker not initialized');

    const id = this.nextId++;
    const envelope: WorkerEnvelope = { id, request };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      if (transfer?.length) {
        this.worker!.postMessage(envelope, transfer);
      } else {
        this.worker!.postMessage(envelope);
      }
    });
  }

  private _getWorkerScript(): string {
    return `
      let wasm = null;
      let bridge = null;
      let doc = null;

      self.onmessage = async (e) => {
        const { id, request } = e.data;

        try {
          let result;

          switch (request.type) {
            case 'init':
              // In production, import pdfnova WASM loader here
              result = { ready: true };
              break;

            case 'open':
              result = { pageCount: 0 };
              break;

            case 'render':
              result = { data: new ArrayBuffer(0), width: 0, height: 0 };
              break;

            case 'getText':
              result = '';
              break;

            case 'getTextSpans':
              result = [];
              break;

            case 'search':
              result = [];
              break;

            case 'closeDoc':
              doc = null;
              result = null;
              break;

            case 'destroy':
              doc = null;
              wasm = null;
              result = null;
              break;
          }

          self.postMessage({ id, type: 'success', data: result });
        } catch (err) {
          self.postMessage({ id, type: 'error', message: err.message });
        }
      };
    `;
  }
}
