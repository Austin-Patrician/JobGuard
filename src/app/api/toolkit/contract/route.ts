import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai, AI_MODEL } from "@/lib/ai";
import { CONTRACT_SYSTEM_PROMPT } from "@/lib/prompts";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/request-guard";
import { RATE_LIMIT_CONFIG, BODY_SIZE_LIMITS, AI_INPUT_LIMITS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { limit, windowMs } = RATE_LIMIT_CONFIG.AI;
    if (!checkRateLimit(`contract:${ip}`, limit, windowMs)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
      );
    }

    const parsed = await parseJsonBody<{
      mode: "text" | "images";
      text?: string;
      imagesBase64?: string[];
    }>(request, BODY_SIZE_LIMITS.CONTRACT);
    if (!parsed.ok) return parsed.response;
    const { mode, text, imagesBase64 } = parsed.data;

    if (mode === "text") {
      if (!text || text.length < 20) {
        return NextResponse.json(
          { error: "合同内容至少需要20个字符", code: "INPUT_TOO_SHORT" },
          { status: 400 }
        );
      }
      if (text.length > AI_INPUT_LIMITS.CONTRACT_TEXT) {
        return NextResponse.json(
          { error: `合同文本不能超过${AI_INPUT_LIMITS.CONTRACT_TEXT}个字符`, code: "INPUT_TOO_LONG" },
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
      let totalSize = 0;
      for (const img of imagesBase64) {
        if (img.length > AI_INPUT_LIMITS.IMAGE_SINGLE_BASE64) {
          return NextResponse.json(
            { error: "单张图片大小不能超过2MB", code: "IMAGE_TOO_LARGE" },
            { status: 400 }
          );
        }
        totalSize += img.length;
      }
      if (totalSize > AI_INPUT_LIMITS.IMAGE_TOTAL_BASE64) {
        return NextResponse.json(
          { error: "图片总大小不能超过10MB", code: "IMAGES_TOO_LARGE" },
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
        ? [{ type: "text" as const, text: `请分析以下劳动合同内容：\n\n${text}` }]
        : [
            { type: "text" as const, text: `请分析以下劳动合同图片（共${imagesBase64!.length}页）：` },
            ...imagesBase64!.map((img) => {
              const parsedUrl = parseDataUrl(img);
              return parsedUrl
                ? {
                    type: "image" as const,
                    image: parsedUrl.data,
                    mediaType: parsedUrl.mediaType,
                  }
                : {
                    type: "image" as const,
                    image: img,
                  };
            }),
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
