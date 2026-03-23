declare module "pdf-parse" {
  interface PdfParseOptions {
    max?: number;
    pagerender?: (pageData: unknown) => Promise<string>;
    version?: string;
  }

  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version: string;
    text: string;
  }

  export default function pdfParse(
    dataBuffer: Uint8Array | Buffer,
    options?: PdfParseOptions
  ): Promise<PdfParseResult>;
}
