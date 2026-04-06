import { describe, it, expect, beforeEach } from 'vitest';
import { setTier, getTier, isFullTier, requireFull } from '../src/capabilities';

describe('capabilities', () => {
  beforeEach(() => {
    setTier('lite');
  });

  it('defaults to lite after setTier("lite")', () => {
    expect(getTier()).toBe('lite');
    expect(isFullTier()).toBe(false);
  });

  it('switches to full tier', () => {
    setTier('full');
    expect(getTier()).toBe('full');
    expect(isFullTier()).toBe(true);
  });

  it('requireFull throws on lite tier with descriptive message', () => {
    setTier('lite');
    expect(() => requireFull('Annotations')).toThrow(
      "Annotations requires the full build of pdfnova. Import from 'pdfnova' instead of 'pdfnova/lite'.",
    );
  });

  it('requireFull does not throw on full tier', () => {
    setTier('full');
    expect(() => requireFull('Annotations')).not.toThrow();
  });
});
