import { NextResponse } from "next/server";

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<T>(
  request: Request,
  maxSizeBytes: number
): Promise<ParseResult<T>> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "请求体过大", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      ),
    };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxSizeBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "请求体过大", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      ),
    };
  }

  try {
    const data = JSON.parse(text) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "无效的 JSON", code: "INVALID_JSON" },
        { status: 400 }
      ),
    };
  }
}
