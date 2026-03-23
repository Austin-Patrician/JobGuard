import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai, AI_MODEL } from "@/lib/ai";
import { RESUME_OPTIMIZER_SYSTEM_PROMPT } from "@/lib/prompts";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/request-guard";
import { extractTextFromPdfDataUrl } from "@/lib/pdf";
import { RATE_LIMIT_CONFIG, BODY_SIZE_LIMITS, AI_INPUT_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

type ResumeRequestBody = {
  resumeMode: "text" | "pdf";
  resumeText?: string;
  resumePdfBase64?: string;
  jobDescription?: string;
  targetStyle?: "balanced" | "ats" | "impact";
};

const STYLE_PROMPTS: Record<NonNullable<ResumeRequestBody["targetStyle"]>, string> = {
  balanced: "输出保持平衡，兼顾岗位匹配、表达自然和真实性。",
  ats: "优先提升 ATS 可读性，强调关键词覆盖、标准标题和结构清晰。",
  impact: "优先提升成果表达力度，但不得增加不存在的数字或业绩。",
};

function buildInput({
  resumeText,
  jobDescription,
  targetStyle,
}: {
  resumeText: string;
  jobDescription: string;
  targetStyle: NonNullable<ResumeRequestBody["targetStyle"]>;
}) {
  return `请根据以下信息完成简历优化分析。

[优化目标]
${STYLE_PROMPTS[targetStyle]}

[候选人简历]
${resumeText}

[目标岗位 JD]
${jobDescription}`;
}

function mapPdfErrorToResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN_PDF_ERROR";
  if (code === "INVALID_PDF_DATA_URL") {
    return NextResponse.json(
      { error: "PDF 文件格式无效", code },
      { status: 400 }
    );
  }
  if (code === "PDF_TOO_LARGE") {
    return NextResponse.json(
      { error: "PDF 文件过大，请控制在 7MB 以内", code },
      { status: 400 }
    );
  }
  if (code === "PDF_TOO_MANY_PAGES") {
    return NextResponse.json(
      { error: "PDF 页数过多，请控制在 8 页以内", code },
      { status: 400 }
    );
  }
  if (code === "PDF_TEXT_EMPTY") {
    return NextResponse.json(
      { error: "PDF 未提取到足够文本，请改用复制粘贴简历文本", code },
      { status: 400 }
    );
  }
  if (code === "PDF_TEXT_TOO_LONG") {
    return NextResponse.json(
      { error: `PDF 文本过长，请控制在 ${AI_INPUT_LIMITS.RESUME_TEXT} 字以内`, code },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: "PDF 解析失败，请改用复制粘贴简历文本", code: "PDF_PARSE_FAILED" },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { limit, windowMs } = RATE_LIMIT_CONFIG.AI;
    if (!checkRateLimit(`resume:${ip}`, limit, windowMs)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
      );
    }

    const parsed = await parseJsonBody<ResumeRequestBody>(request, BODY_SIZE_LIMITS.RESUME);
    if (!parsed.ok) return parsed.response;

    const {
      resumeMode,
      resumeText,
      resumePdfBase64,
      jobDescription,
      targetStyle = "balanced",
    } = parsed.data;

    if (resumeMode !== "text" && resumeMode !== "pdf") {
      return NextResponse.json(
        { error: "不支持的简历输入模式", code: "INVALID_RESUME_MODE" },
        { status: 400 }
      );
    }

    if (!jobDescription || jobDescription.trim().length < 30) {
      return NextResponse.json(
        { error: "岗位 JD 至少需要 30 个字符", code: "JD_TOO_SHORT" },
        { status: 400 }
      );
    }

    if (jobDescription.length > AI_INPUT_LIMITS.RESUME_JD) {
      return NextResponse.json(
        { error: `岗位 JD 不能超过 ${AI_INPUT_LIMITS.RESUME_JD} 个字符`, code: "JD_TOO_LONG" },
        { status: 400 }
      );
    }

    let normalizedResume = "";

    if (resumeMode === "text") {
      if (!resumeText || resumeText.trim().length < 80) {
        return NextResponse.json(
          { error: "简历内容至少需要 80 个字符", code: "RESUME_TOO_SHORT" },
          { status: 400 }
        );
      }
      if (resumeText.length > AI_INPUT_LIMITS.RESUME_TEXT) {
        return NextResponse.json(
          { error: `简历文本不能超过 ${AI_INPUT_LIMITS.RESUME_TEXT} 个字符`, code: "RESUME_TOO_LONG" },
          { status: 400 }
        );
      }
      normalizedResume = resumeText.trim();
    } else {
      if (!resumePdfBase64) {
        return NextResponse.json(
          { error: "请上传 PDF 简历", code: "PDF_REQUIRED" },
          { status: 400 }
        );
      }

      try {
        const extracted = await extractTextFromPdfDataUrl(resumePdfBase64);
        normalizedResume = extracted.text;
      } catch (error) {
        return mapPdfErrorToResponse(error);
      }
    }

    const result = streamText({
      model: openai(AI_MODEL),
      system: RESUME_OPTIMIZER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildInput({
            resumeText: normalizedResume,
            jobDescription: jobDescription.trim(),
            targetStyle,
          }),
        },
      ],
      maxOutputTokens: 2800,
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
