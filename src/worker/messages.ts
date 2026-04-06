import type { RenderOptions, SearchOptions } from '../types';

export type RequestType = 'init' | 'open' | 'render' | 'getText' | 'getTextSpans' | 'search' | 'closePage' | 'closeDoc' | 'destroy';

export interface InitRequest {
  type: 'init';
  wasmUrl?: string;
  tier: 'lite' | 'full';
}

export interface OpenRequest {
  type: 'open';
  data: ArrayBuffer;
  password?: string;
}

export interface RenderRequest {
  type: 'render';
  pageIndex: number;
  options?: RenderOptions;
}

export interface GetTextRequest {
  type: 'getText';
  pageIndex: number;
}

export interface GetTextSpansRequest {
  type: 'getTextSpans';
  pageIndex: number;
}

export interface SearchRequest {
  type: 'search';
  query: string;
  options?: SearchOptions;
}

export interface ClosePageRequest {
  type: 'closePage';
  pageIndex: number;
}

export interface CloseDocRequest {
  type: 'closeDoc';
}

export interface DestroyRequest {
  type: 'destroy';
}

export type WorkerRequestMessage =
  | InitRequest
  | OpenRequest
  | RenderRequest
  | GetTextRequest
  | GetTextSpansRequest
  | SearchRequest
  | ClosePageRequest
  | CloseDocRequest
  | DestroyRequest;

export interface WorkerResponseSuccess {
  id: number;
  type: 'success';
  data: unknown;
  transfer?: ArrayBuffer[];
}

export interface WorkerResponseError {
  id: number;
  type: 'error';
  message: string;
}

export type WorkerResponseMessage = WorkerResponseSuccess | WorkerResponseError;

export interface WorkerEnvelope {
  id: number;
  request: WorkerRequestMessage;
}
