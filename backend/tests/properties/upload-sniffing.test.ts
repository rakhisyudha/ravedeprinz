import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import { SERVE_TYPES, sniffMime, sniffPdf } from '../../src/services/upload';

// Feature: portfolio-engagement, Property 21: Upload type sniffing separation
const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

const arbTail = fc.uint8Array({ minLength: 0, maxLength: 64 });

// 0x25 is '%', the first PDF magic byte. A generated array whose first byte
// comes from this set can never be a PDF, which is what makes the
// separation property non-vacuous in both directions.
const NON_PERCENT = [0x00, 0x01, 0x42, 0x89, 0xff] as const;

const arbNonPdfBytes = fc
  .tuple(fc.constantFrom(...NON_PERCENT), arbTail)
  .map(([first, rest]) => new Uint8Array([first, ...rest]));

const arbPdfBytes = arbTail.map((tail) => new Uint8Array([...PDF_HEADER, ...tail]));

describe('Property 21: upload type sniffing separation', () => {
  test('sniffPdf is true exactly when the bytes start with %PDF-', () => {
    fc.assert(
      fc.property(arbTail, (tail) => {
        const bytes = new Uint8Array([...PDF_HEADER, ...tail]);
        expect(sniffPdf(bytes)).toBe(true);
        expect(sniffPdf(tail)).toBe(false);
      }),
      { numRuns: 300 },
    );
  });

  test('sniffPdf rejects every array that does not start with %PDF-', () => {
    fc.assert(
      fc.property(arbNonPdfBytes, (bytes) => {
        expect(sniffPdf(bytes)).toBe(false);
      }),
      { numRuns: 300 },
    );
  });

  test('no PDF byte array is ever accepted by the image sniffer', () => {
    fc.assert(
      fc.property(arbPdfBytes, (pdf) => {
        expect(sniffMime(pdf)).toBeNull();
      }),
      { numRuns: 300 },
    );
  });

  test('overwriting a header byte with anything else stops the PDF sniff', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 255 }),
        (index, byte) => {
          const bytes = new Uint8Array([...PDF_HEADER, 0x31, 0x0a]);
          bytes[index] = byte;
          expect(sniffPdf(bytes)).toBe(byte === PDF_HEADER[index]);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('bytes after the header never affect the PDF sniff', () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 6 }), fc.integer({ min: 0, max: 255 }), (index, byte) => {
        const bytes = new Uint8Array([...PDF_HEADER, 0x31, 0x0a]);
        bytes[index] = byte;
        expect(sniffPdf(bytes)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  test('real image magic bytes are still sniffed and PDFs are not', () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe('image/jpeg');
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe('image/png');
    expect(sniffMime(new Uint8Array([...PDF_HEADER, ...new Array(20).fill(0x20)]))).toBeNull();
  });

  test('the serve-type map covers pdf and keeps the image extensions', () => {
    expect(SERVE_TYPES.pdf).toBe('application/pdf');
    for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif']) {
      expect(SERVE_TYPES[ext]).toMatch(/^image\//);
    }
  });
});
