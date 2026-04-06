export { PDFDocument } from './document/PDFDocument';
export { PDFPage } from './document/PDFPage';
export { PageRenderer } from './document/PageRenderer';
export { VirtualRenderer } from './document/VirtualRenderer';
export { TextExtractor } from './text/TextExtractor';
export { TextLayerBuilder } from './text/TextLayerBuilder';
export { SearchEngine } from './text/SearchEngine';
export { OutlineExtractor } from './navigation/OutlineExtractor';
export { LinkExtractor } from './navigation/LinkExtractor';
export { AnnotationReader } from './annotations/AnnotationReader';
export { AnnotationWriter } from './annotations/AnnotationWriter';
export { FormReader } from './forms/FormReader';
export { FormFiller } from './forms/FormFiller';
export { FormFlattener } from './forms/FormFlattener';
export { SignatureVerifier } from './signatures/SignatureVerifier';
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
  AnnotationData,
  AnnotationColor,
  AnnotationRect,
  AttachmentPoint,
  CreateAnnotationOptions,
  FormFieldData,
  SignatureData,
  SignatureVerificationResult,
} from './types';

export { RENDER_FLAG, AnnotationType, FormFieldType, FLATTEN_USAGE } from './types';

import { setTier } from './capabilities';
setTier('full');
