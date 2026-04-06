#!/usr/bin/env bash
set -euo pipefail

# ─── PDFium WASM Build Script ──────────────────────────────────────
#
# Prerequisites:
#   - Emscripten SDK (emsdk) installed and activated
#   - depot_tools in PATH (for gclient/gn)
#   - ~10GB disk space for PDFium source
#
# Usage:
#   bash wasm/build.sh          # Build both lite and full
#   bash wasm/build.sh lite     # Build lite only
#   bash wasm/build.sh full     # Build full only
#
# Output:
#   dist/pdfium-lite.wasm + dist/pdfium-lite.js
#   dist/pdfium-full.wasm + dist/pdfium-full.js

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${PROJECT_DIR}/.pdfium-build"
DIST_DIR="${PROJECT_DIR}/dist"

PDFIUM_BRANCH="chromium/6834"  # Stable branch
BUILD_TARGET="${1:-both}"

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[pdfnova]${NC} $*"; }
warn() { echo -e "${YELLOW}[pdfnova]${NC} $*"; }
error() { echo -e "${RED}[pdfnova]${NC} $*" >&2; }

# ─── Check prerequisites ────────────────────────────────────────
check_prereqs() {
  if ! command -v emcc &> /dev/null; then
    error "Emscripten (emcc) not found. Install emsdk first:"
    error "  https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
  fi
  log "Emscripten version: $(emcc --version | head -1)"
}

# ─── Fetch PDFium source ────────────────────────────────────────
fetch_pdfium() {
  if [ -d "${BUILD_DIR}/pdfium" ]; then
    log "PDFium source already present, skipping fetch"
    return
  fi

  log "Fetching PDFium source (branch: ${PDFIUM_BRANCH})..."
  mkdir -p "$BUILD_DIR"
  cd "$BUILD_DIR"

  if ! command -v gclient &> /dev/null; then
    warn "depot_tools not found, cloning..."
    git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
    export PATH="${BUILD_DIR}/depot_tools:$PATH"
  fi

  gclient config --unmanaged https://pdfium.googlesource.com/pdfium.git
  gclient sync --revision "origin/${PDFIUM_BRANCH}" --no-history

  cd pdfium
  git checkout "origin/${PDFIUM_BRANCH}"
}

# ─── Common exported functions (both tiers) ──────────────────────
CORE_EXPORTS=(
  # Lifecycle
  "_FPDF_InitLibraryWithConfig"
  "_FPDF_DestroyLibrary"
  "_FPDF_LoadMemDocument"
  "_FPDF_CloseDocument"
  "_FPDF_GetLastError"
  "_FPDF_GetPageCount"
  # Pages
  "_FPDF_LoadPage"
  "_FPDF_ClosePage"
  "_FPDF_GetPageWidthF"
  "_FPDF_GetPageHeightF"
  # Bitmap rendering
  "_FPDFBitmap_Create"
  "_FPDFBitmap_FillRect"
  "_FPDFBitmap_GetBuffer"
  "_FPDFBitmap_GetStride"
  "_FPDFBitmap_Destroy"
  "_FPDF_RenderPageBitmap"
  # Text
  "_FPDFText_LoadPage"
  "_FPDFText_ClosePage"
  "_FPDFText_CountChars"
  "_FPDFText_GetUnicode"
  "_FPDFText_GetFontSize"
  "_FPDFText_GetCharBox"
  "_FPDFText_GetText"
  "_FPDFText_FindStart"
  "_FPDFText_FindNext"
  "_FPDFText_FindClose"
  "_FPDFText_GetSchResultIndex"
  "_FPDFText_GetSchCount"
  "_FPDFText_CountRects"
  "_FPDFText_GetRect"
  # Metadata
  "_FPDF_GetMetaText"
  # Bookmarks
  "_FPDFBookmark_GetFirstChild"
  "_FPDFBookmark_GetNextSibling"
  "_FPDFBookmark_GetTitle"
  "_FPDFBookmark_GetAction"
  "_FPDFBookmark_GetDest"
  "_FPDFDest_GetDestPageIndex"
  # Links
  "_FPDFLink_LoadWebLinks"
  "_FPDFLink_CountWebLinks"
  "_FPDFLink_GetURL"
  "_FPDFLink_CountRects"
  "_FPDFLink_GetRect"
  "_FPDFLink_CloseWebLinks"
  # Emscripten
  "_malloc"
  "_free"
)

# ─── Full-tier additional exports ────────────────────────────────
FULL_EXPORTS=(
  # Annotations
  "_FPDFPage_GetAnnotCount"
  "_FPDFPage_GetAnnot"
  "_FPDFPage_CreateAnnot"
  "_FPDFPage_RemoveAnnot"
  "_FPDFAnnot_GetSubtype"
  "_FPDFAnnot_GetRect"
  "_FPDFAnnot_SetRect"
  "_FPDFAnnot_GetColor"
  "_FPDFAnnot_SetColor"
  "_FPDFAnnot_GetStringValue"
  "_FPDFAnnot_SetStringValue"
  "_FPDFAnnot_AppendAttachmentPoints"
  "_FPDFAnnot_CountAttachmentPoints"
  "_FPDFAnnot_GetAttachmentPoints"
  "_FPDFPage_CloseAnnot"
  # Forms
  "_FPDFDOC_InitFormFillEnvironment"
  "_FPDFDOC_ExitFormFillEnvironment"
  "_FPDF_GetFormType"
  "_FPDFPage_HasFormFieldAtPoint"
  "_FPDFAnnot_GetFormFieldType"
  "_FPDFAnnot_GetFormFieldName"
  "_FPDFAnnot_GetFormFieldValue"
  "_FPDFAnnot_GetFormFieldFlags"
  "_FPDFAnnot_IsChecked"
  "_FPDFPage_Flatten"
  # Save
  "_FPDF_SaveAsCopy"
  "_FPDF_SaveWithVersion"
  # Signatures
  "_FPDF_GetSignatureCount"
  "_FPDF_GetSignatureObject"
  "_FPDFSignObj_GetContents"
  "_FPDFSignObj_GetByteRange"
  "_FPDFSignObj_GetSubFilter"
  "_FPDFSignObj_GetReason"
  "_FPDFSignObj_GetTime"
  "_FPDFSignObj_GetDocMDPPermission"
)

# ─── Common Emscripten flags ────────────────────────────────────
COMMON_FLAGS=(
  -s WASM=1
  -s ALLOW_MEMORY_GROWTH=1
  -s INITIAL_MEMORY=33554432      # 32MB initial
  -s MAXIMUM_MEMORY=536870912     # 512MB max
  -s MODULARIZE=1
  -s EXPORT_ES6=1
  -s ENVIRONMENT=web,worker
  -s FILESYSTEM=0
  -s DYNAMIC_EXECUTION=0
  -s TEXTDECODER=2
  -s SINGLE_FILE=0
  -O3
  --closure 1
)

# ─── Build function ──────────────────────────────────────────────
build_variant() {
  local variant="$1"
  shift
  local exports=("$@")

  log "Building pdfium-${variant}.wasm..."

  local exports_str
  exports_str=$(printf "'%s'," "${exports[@]}")
  exports_str="[${exports_str%,}]"

  local out_dir="${BUILD_DIR}/out-${variant}"
  mkdir -p "$out_dir"

  cd "${BUILD_DIR}/pdfium"

  # GN args for PDFium build
  local gn_args="is_debug=false"
  gn_args+=" pdf_is_standalone=true"
  gn_args+=" is_component_build=false"
  gn_args+=" clang_use_chrome_plugins=false"
  gn_args+=" pdf_enable_xfa=false"
  gn_args+=" pdf_enable_v8=false"
  gn_args+=" pdf_use_skia=false"
  gn_args+=" treat_warnings_as_errors=false"
  gn_args+=" use_custom_libcxx=false"

  if [ "$variant" = "lite" ]; then
    gn_args+=" pdf_enable_click_logging=false"
  fi

  gn gen "$out_dir" --args="$gn_args"
  ninja -C "$out_dir" pdfium

  mkdir -p "$DIST_DIR"

  local module_name
  if [ "$variant" = "lite" ]; then
    module_name="PDFiumLite"
  else
    module_name="PDFiumFull"
  fi

  emcc \
    "${COMMON_FLAGS[@]}" \
    -s "EXPORTED_FUNCTIONS=${exports_str}" \
    -s EXPORTED_RUNTIME_METHODS="['UTF8ToString','UTF16ToString','stringToUTF8','stringToUTF16','lengthBytesUTF8','lengthBytesUTF16']" \
    -s "EXPORT_NAME='${module_name}'" \
    -I "${BUILD_DIR}/pdfium/public" \
    "${out_dir}/obj/libpdfium.a" \
    -o "${DIST_DIR}/pdfium-${variant}.js"

  log "Built: dist/pdfium-${variant}.wasm ($(du -h "${DIST_DIR}/pdfium-${variant}.wasm" | cut -f1))"
  log "Built: dist/pdfium-${variant}.js ($(du -h "${DIST_DIR}/pdfium-${variant}.js" | cut -f1))"
}

# ─── Main ────────────────────────────────────────────────────────
main() {
  check_prereqs
  fetch_pdfium

  case "$BUILD_TARGET" in
    lite)
      build_variant "lite" "${CORE_EXPORTS[@]}"
      ;;
    full)
      build_variant "full" "${CORE_EXPORTS[@]}" "${FULL_EXPORTS[@]}"
      ;;
    both|*)
      build_variant "lite" "${CORE_EXPORTS[@]}"
      build_variant "full" "${CORE_EXPORTS[@]}" "${FULL_EXPORTS[@]}"
      ;;
  esac

  log "Build complete!"
  ls -lh "${DIST_DIR}"/pdfium-*.wasm "${DIST_DIR}"/pdfium-*.js 2>/dev/null || true
}

main "$@"
