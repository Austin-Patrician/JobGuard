import pdfParse from "pdf-parse";
import { AI_INPUT_LIMITS } from "@/lib/constants";

function parsePdfDataUrl(value: string) {
  const match = value.match(/^data:application\/pdf;base64,(.+)$/);
  if (!match) return null;
  return match[1];
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromPdfDataUrl(dataUrl: string) {
  const base64 = parsePdfDataUrl(dataUrl);
  if (!base64) {
    throw new Error("INVALID_PDF_DATA_URL");
  }

  if (base64.length > AI_INPUT_LIMITS.RESUME_PDF_BASE64) {
    throw new Error("PDF_TOO_LARGE");
  }

  const buffer = Buffer.from(base64, "base64");
  const parsed = await pdfParse(buffer);

  if (parsed.numpages > AI_INPUT_LIMITS.RESUME_PDF_PAGES) {
    throw new Error("PDF_TOO_MANY_PAGES");
  }

  const text = normalizeExtractedText(parsed.text);
  if (text.length < 80) {
    throw new Error("PDF_TEXT_EMPTY");
  }

  if (text.length > AI_INPUT_LIMITS.RESUME_TEXT) {
    throw new Error("PDF_TEXT_TOO_LONG");
  }

  return {
    pageCount: parsed.numpages,
    text,
  };
}
