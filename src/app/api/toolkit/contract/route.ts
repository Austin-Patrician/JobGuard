import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai, AI_MODEL } from "@/lib/ai";
import { CONTRACT_SYSTEM_PROMPT } from "@/lib/prompts";

const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  requestTimestamps.set(ip, recent);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { mode, text, imagesBase64 } = body as {
      mode: "text" | "images";
      text?: string;
      imagesBase64?: string[];
    };

    if (mode === "text") {
      if (!text || text.length < 20) {
        return NextResponse.json(
          { error: "合同内容至少需要20个字符", code: "INPUT_TOO_SHORT" },
          { status: 400 }
        );
      }
    }

    if (mode === "images") {
      if (!imagesBase64 || imagesBase64.length === 0) {
        return NextResponse.json(
          { error: "请上传合同图片", code: "NO_IMAGES" },
          { status: 400 }
        );
      }
      if (imagesBase64.length > 10) {
        return NextResponse.json(
          { error: "最多上传10张图片", code: "TOO_MANY_IMAGES" },
          { status: 400 }
        );
      }
    }

    const userContent =
      mode === "text"
        ? [{ type: "text" as const, text: `请分析以下劳动合同内容：\n\n${text}` }]
        : [
            { type: "text" as const, text: `请分析以下劳动合同图片（共${imagesBase64!.length}页）：` },
            ...imagesBase64!.map((img) => ({
              type: "image" as const,
              image: img,
            })),
          ];

    const result = streamText({
      model: openai(AI_MODEL),
      system: CONTRACT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      maxOutputTokens: 3000,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch {
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后再试", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
