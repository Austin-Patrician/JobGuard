import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai, AI_MODEL } from "@/lib/ai";
import { MIRROR_SYSTEM_PROMPT } from "@/lib/prompts";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/request-guard";
import { RATE_LIMIT_CONFIG, BODY_SIZE_LIMITS, AI_INPUT_LIMITS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { limit, windowMs } = RATE_LIMIT_CONFIG.AI;
    if (!checkRateLimit(`mirror:${ip}`, limit, windowMs)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
      );
    }

    const parsed = await parseJsonBody<{
      mode: "text" | "image";
      text?: string;
      imageBase64?: string;
    }>(request, BODY_SIZE_LIMITS.MIRROR);
    if (!parsed.ok) return parsed.response;
    const { mode, text, imageBase64 } = parsed.data;

    if (mode === "text") {
      if (!text || text.length < 20) {
        return NextResponse.json(
          { error: "文本内容至少需要20个字符", code: "INPUT_TOO_SHORT" },
          { status: 400 }
        );
      }
      if (text.length > 5000) {
        return NextResponse.json(
          { error: "文本内容不能超过5000个字符", code: "INPUT_TOO_LONG" },
          { status: 400 }
        );
      }
    }

    if (mode === "image") {
      if (!imageBase64) {
        return NextResponse.json(
          { error: "请上传图片", code: "NO_IMAGE" },
          { status: 400 }
        );
      }
      if (imageBase64.length > AI_INPUT_LIMITS.IMAGE_SINGLE_BASE64) {
        return NextResponse.json(
          { error: "图片大小不能超过2MB", code: "IMAGE_TOO_LARGE" },
          { status: 400 }
        );
      }
    }

    const parseDataUrl = (value: string) => {
      const match = value.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return null;
      return { mediaType: match[1], data: match[2] };
    };

    const userContent =
      mode === "text"
        ? [{ type: "text" as const, text: text! }]
        : [
            { type: "text" as const, text: "请分析以下招聘截图中的内容：" },
            (() => {
              const parsedUrl = parseDataUrl(imageBase64!);
              return parsedUrl
                ? {
                    type: "image" as const,
                    image: parsedUrl.data,
                    mediaType: parsedUrl.mediaType,
                  }
                : { type: "image" as const, image: imageBase64! };
            })(),
          ];

    const result = streamText({
      model: openai(AI_MODEL),
      system: MIRROR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      maxOutputTokens: 2000,
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
