export { PDFDocument } from './document/PDFDocument';
export { PDFPage } from './document/PDFPage';
export { PageRenderer } from './document/PageRenderer';
export { VirtualRenderer } from './document/VirtualRenderer';
export { TextExtractor } from './text/TextExtractor';
export { TextLayerBuilder } from './text/TextLayerBuilder';
export { SearchEngine } from './text/SearchEngine';
export { OutlineExtractor } from './navigation/OutlineExtractor';
export { LinkExtractor } from './navigation/LinkExtractor';
export { PDFWorker } from './worker/PDFWorker';
export { WorkerPool } from './worker/WorkerPool';
export { WasmLoader } from './core/WasmLoader';
export { getTier, isFullTier } from './capabilities';

export type {
  PDFMetadata,
  PDFPermissions,
  RenderOptions,
  TextSpan,
  CharBox,
  SearchResult,
  SearchOptions,
  TextRect,
  OutlineItem,
  LinkInfo,
  OpenOptions,
  PDFNovaConfig,
  VirtualRendererOptions,
  WasmTier,
} from './types';

export { RENDER_FLAG } from './types';

import { setTier } from './capabilities';
setTier('lite');
