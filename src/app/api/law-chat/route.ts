import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai, AI_MODEL } from "@/lib/ai";
import { LAW_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/request-guard";
import { RATE_LIMIT_CONFIG, BODY_SIZE_LIMITS, AI_INPUT_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

interface LawArticle {
  id: string;
  lawId: string;
  lawName: string;
  articleNo: string;
  chapter: string;
  section: string | null;
  topics: string[];
  content: string;
  summary: string;
  embedding?: number[];
}

interface LawIndex {
  articles: LawArticle[];
  generatedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "src", "data", "law");
const INDEX_PATH = path.join(DATA_DIR, "law.index.json");
const LAW_FILES = [
  path.join(DATA_DIR, "labor-law.txt"),
  path.join(DATA_DIR, "labor-contract-law.txt"),
];

let cachedArticles: LawArticle[] | null = null;

function detectLawId(name: string) {
  if (name.includes("劳动合同法")) return "labor-contract-law";
  if (name.includes("劳动法")) return "labor-law";
  return name.replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function parseArticles(text: string, lawName: string, lawId: string): LawArticle[] {
  const cleaned = text.replace(/\r/g, "");
  const matches = [...cleaned.matchAll(/第[一二三四五六七八九十百千零〇0-9]+条/g)];
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? cleaned.length;
    const content = cleaned.slice(start, end).trim();
    const summary = content.replace(/\s+/g, " ").slice(0, 120);
    return {
      id: `${lawId}-${match[0]}`,
      lawId,
      lawName,
      articleNo: match[0],
      chapter: "",
      section: null,
      topics: [],
      content,
      summary,
    };
  });
}

function loadArticles(): LawArticle[] {
  if (cachedArticles) return cachedArticles;

  if (existsSync(INDEX_PATH)) {
    const raw = readFileSync(INDEX_PATH, "utf8");
    try {
      const parsed = JSON.parse(raw) as LawIndex;
      if (Array.isArray(parsed.articles) && parsed.articles.length > 0) {
        cachedArticles = parsed.articles;
        return cachedArticles;
      }
    } catch {
      // fall through to raw parsing
    }
  }

  const articles: LawArticle[] = [];
  for (const filePath of LAW_FILES) {
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    const firstLine = text.split(/\n/).find((line) => line.trim())?.trim() ?? "未知法律";
    const lawId = detectLawId(firstLine);
    const lawName = firstLine;
    articles.push(...parseArticles(text, lawName, lawId));
  }

  cachedArticles = articles;
  return cachedArticles;
}

// ─── Synonym Dictionary ─────────────────────────────────────────────────────

const SYNONYMS: Record<string, string[]> = {
  裁员: ["经济性裁员", "裁减人员", "解除劳动合同", "裁减"],
  辞退: ["解除劳动合同", "开除", "解雇", "解除合同"],
  开除: ["解除劳动合同", "辞退"],
  被炒: ["解除劳动合同", "辞退", "开除"],
  补偿: ["经济补偿", "赔偿金", "补偿金"],
  赔偿: ["赔偿金", "经济补偿", "赔偿责任"],
  "N+1": ["经济补偿", "一个月工资"],
  工资: ["劳动报酬", "薪酬", "报酬", "工资报酬"],
  薪资: ["劳动报酬", "工资", "报酬"],
  欠薪: ["拖欠", "克扣", "工资"],
  拖欠: ["克扣", "拖欠劳动报酬", "未足额支付"],
  "996": ["加班", "延长工作时间", "工作时间"],
  加班: ["延长工作时间", "加班费", "工作时间"],
  工时: ["工作时间", "加班", "休息"],
  五险一金: ["社会保险", "保险福利", "社会保险费"],
  社保: ["社会保险", "社会保险费", "保险"],
  公积金: ["社会保险", "补充保险"],
  外包: ["劳务派遣", "派遣"],
  派遣: ["劳务派遣", "派遣劳动者", "用工单位"],
  试用期: ["试用", "试用期间"],
  竞业: ["竞业限制", "保密", "竞业限制条款"],
  保密: ["竞业限制", "保密义务", "商业秘密"],
  合同: ["劳动合同", "合同"],
  签合同: ["订立劳动合同", "书面劳动合同"],
  没签合同: ["未订立书面劳动合同", "未签合同"],
  产假: ["生育", "女职工", "哺乳期", "孕期"],
  年假: ["年休假", "带薪年休假", "休假"],
  休假: ["年休假", "休息", "带薪"],
  仲裁: ["劳动争议仲裁", "仲裁委员会", "劳动争议"],
  违约金: ["违约", "违约金", "赔偿"],
  最低工资: ["最低工资标准", "最低工资保障"],
  无固定期限: ["无固定期限劳动合同", "无确定终止时间"],
};

// ─── Intent Detection ────────────────────────────────────────────────────────

interface DetectedIntent {
  intent: string;
  topics: string[];
  extraTokens: string[];
}

const INTENT_PATTERNS: { pattern: RegExp; intent: string; topics: string[]; extraTokens: string[] }[] = [
  { pattern: /试用期/, intent: "probation", topics: ["试用期", "合同订立"], extraTokens: ["试用期", "试用"] },
  { pattern: /裁员|辞退|开除|被炒|炒鱿鱼|解雇/, intent: "termination", topics: ["解除合同", "经济补偿", "裁员"], extraTokens: ["解除劳动合同", "裁减人员"] },
  { pattern: /补偿|赔偿|N\+1/, intent: "compensation", topics: ["经济补偿"], extraTokens: ["经济补偿", "赔偿金"] },
  { pattern: /加班|996|工时|工作时间/, intent: "overtime", topics: ["工时", "加班"], extraTokens: ["延长工作时间", "加班费"] },
  { pattern: /工资|拖欠|欠薪|克扣/, intent: "wage", topics: ["工资", "报酬"], extraTokens: ["劳动报酬", "工资报酬"] },
  { pattern: /合同.*签|没签合同|不签合同|书面合同/, intent: "contract", topics: ["合同订立"], extraTokens: ["书面劳动合同", "订立"] },
  { pattern: /派遣|外包/, intent: "dispatch", topics: ["劳务派遣"], extraTokens: ["劳务派遣", "派遣劳动者"] },
  { pattern: /社保|五险|公积金/, intent: "insurance", topics: ["社会保险", "保险福利"], extraTokens: ["社会保险", "社会保险费"] },
  { pattern: /竞业|保密/, intent: "non_compete", topics: ["竞业限制", "保密"], extraTokens: ["竞业限制", "保密义务"] },
  { pattern: /产假|怀孕|哺乳|孕期/, intent: "maternity", topics: ["女职工保护", "产假"], extraTokens: ["女职工", "生育", "产假"] },
  { pattern: /年假|休假|带薪/, intent: "leave", topics: ["休假"], extraTokens: ["年休假", "带薪年休假"] },
  { pattern: /仲裁|诉讼|维权|投诉/, intent: "dispute", topics: ["劳动争议", "仲裁"], extraTokens: ["劳动争议", "仲裁"] },
  { pattern: /无固定期限|永久合同/, intent: "permanent_contract", topics: ["合同订立"], extraTokens: ["无固定期限劳动合同"] },
  { pattern: /违约金/, intent: "penalty", topics: ["违约金"], extraTokens: ["违约金", "违约"] },
];

function detectIntents(question: string): DetectedIntent[] {
  const intents: DetectedIntent[] = [];
  for (const { pattern, intent, topics, extraTokens } of INTENT_PATTERNS) {
    if (pattern.test(question)) {
      intents.push({ intent, topics, extraTokens });
    }
  }
  return intents;
}

// ─── Token Extraction with Synonym Expansion ─────────────────────────────────

function extractTokens(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9]+|[\u4e00-\u9fa5]+/g) ?? [];
  const tokens = new Set<string>();
  for (const match of matches) {
    if (/^[a-zA-Z0-9]+$/.test(match)) {
      tokens.add(match);
      continue;
    }
    if (match.length <= 2) {
      tokens.add(match);
      continue;
    }
    if (match.length <= 4) {
      tokens.add(match);
    }
    for (let size = 2; size <= 4; size += 1) {
      for (let i = 0; i <= match.length - size; i += 1) {
        tokens.add(match.slice(i, i + size));
      }
    }
  }
  return Array.from(tokens).slice(0, 30);
}

function expandWithSynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const syns = SYNONYMS[token];
    if (syns) {
      for (const s of syns) expanded.add(s);
    }
  }
  return Array.from(expanded);
}

// ─── Enhanced Keyword Search ─────────────────────────────────────────────────

function keywordSearch(question: string, articles: LawArticle[]): { article: LawArticle; score: number }[] {
  const rawTokens = extractTokens(question);
  const intents = detectIntents(question);

  // Collect extra tokens from intents
  const intentExtraTokens: string[] = [];
  const intentTopics = new Set<string>();
  for (const intent of intents) {
    intentExtraTokens.push(...intent.extraTokens);
    for (const t of intent.topics) intentTopics.add(t);
  }

  const allTokens = expandWithSynonyms([...rawTokens, ...intentExtraTokens]);

  const scored = articles.map((article) => {
    let score = 0;
    const contentAndSummary = article.content + " " + article.summary;

    // Token matching with length-based weighting
    for (const token of allTokens) {
      if (contentAndSummary.includes(token)) {
        if (token.length >= 4) score += 3;
        else if (token.length >= 3) score += 2;
        else score += 1;
      }
    }

    // Topic bonus: intersection of intent topics and article topics
    if (article.topics && article.topics.length > 0) {
      for (const topic of article.topics) {
        if (intentTopics.has(topic)) {
          score += 3;
        }
      }
    }

    // Chapter bonus: if multiple articles match, same-chapter articles get a boost
    // (applied during re-ranking, not here)

    return { article, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

// ─── Cosine Similarity ───────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── RRF Hybrid Merge ───────────────────────────────────────────────────────

const RRF_K = 60;
const TOP_K = 6;

function rrfMerge(
  kwResults: { article: LawArticle; score: number }[],
  embResults: { article: LawArticle; score: number }[],
): LawArticle[] {
  const rrfScores = new Map<string, { article: LawArticle; score: number }>();

  kwResults.forEach(({ article }, rank) => {
    const id = article.id;
    const existing = rrfScores.get(id) ?? { article, score: 0 };
    existing.score += 1 / (RRF_K + rank);
    rrfScores.set(id, existing);
  });

  embResults.forEach(({ article }, rank) => {
    const id = article.id;
    const existing = rrfScores.get(id) ?? { article, score: 0 };
    existing.score += 1 / (RRF_K + rank);
    rrfScores.set(id, existing);
  });

  return Array.from(rrfScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((item) => item.article);
}

// ─── Search Orchestrator ─────────────────────────────────────────────────────

async function searchArticles(question: string, articles: LawArticle[]): Promise<LawArticle[]> {
  const kwResults = keywordSearch(question, articles);

  const withEmbeddings = articles.filter(
    (a) => Array.isArray(a.embedding) && a.embedding.length > 0
  );

  if (withEmbeddings.length > 0) {
    // Hybrid: keyword + embedding with RRF
    const { embedding } = await generateTextEmbedding(question);
    const embScored = withEmbeddings
      .map((article) => ({
        article,
        score: cosineSimilarity(embedding, article.embedding ?? []),
      }))
      .filter((item) => item.score >= 0.35)
      .sort((a, b) => b.score - a.score);

    if (embScored.length > 0) {
      return rrfMerge(kwResults, embScored);
    }
  }

  // Keyword-only fallback
  if (kwResults.length === 0) return articles.slice(0, TOP_K);
  return kwResults.slice(0, TOP_K).map((item) => item.article);
}

// ─── Context Builder ─────────────────────────────────────────────────────────

function buildContext(articles: LawArticle[]) {
  return articles
    .map((article) => {
      const parts: string[] = [];

      if (article.chapter) {
        let chapterLine = `[所属章节] ${article.lawName} > ${article.chapter}`;
        if (article.section) chapterLine += ` > ${article.section}`;
        parts.push(chapterLine);
      }

      parts.push(`[法条] ${article.articleNo}`);

      if (article.topics && article.topics.length > 0) {
        parts.push(`[主题标签] ${article.topics.join(", ")}`);
      }

      parts.push(`[摘要] ${article.summary}`);
      parts.push(`[原文] ${article.content}`);

      return parts.join("\n");
    })
    .join("\n\n");
}

// ─── API Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { limit, windowMs } = RATE_LIMIT_CONFIG.AI;
    if (!checkRateLimit(`law-chat:${ip}`, limit, windowMs)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
      );
    }

    const parsed = await parseJsonBody<{ question?: string }>(request, BODY_SIZE_LIMITS.LAW_CHAT);
    if (!parsed.ok) return parsed.response;
    const { question } = parsed.data;

    if (!question || question.trim().length < 5) {
      return NextResponse.json(
        { error: "问题过短，请补充细节", code: "INPUT_TOO_SHORT" },
        { status: 400 }
      );
    }

    if (question.length > AI_INPUT_LIMITS.LAW_CHAT_QUESTION) {
      return NextResponse.json(
        { error: `问题不能超过${AI_INPUT_LIMITS.LAW_CHAT_QUESTION}个字符`, code: "INPUT_TOO_LONG" },
        { status: 400 }
      );
    }

    const articles = loadArticles();
    if (articles.length === 0) {
      return NextResponse.json(
        { error: "未加载到法条数据", code: "LAW_DATA_MISSING" },
        { status: 500 }
      );
    }

    const topArticles = await searchArticles(question, articles);
    const context = buildContext(topArticles);

    const { text } = await generateText({
      model: openai(AI_MODEL),
      system: LAW_CHAT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `用户问题：${question}\n\n可引用法条：\n${context}`,
        },
      ],
      maxOutputTokens: 1200,
      temperature: 0.2,
    });

    const parsedJson = safeParseJson(text);
    const fallbackCitations = topArticles.slice(0, 3).map((article) => ({
      law: article.lawName,
      article: article.articleNo,
      summary: article.summary,
    }));

    const responseBody = {
      answer: parsedJson?.answer ?? text,
      citations:
        parsedJson?.citations && parsedJson.citations.length > 0
          ? parsedJson.citations.slice(0, 5)
          : fallbackCitations,
    };

    return NextResponse.json(responseBody);
  } catch {
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后再试", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

async function generateTextEmbedding(value: string) {
  const { embed } = await import("ai");
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value,
  });
  return { embedding };
}

function safeParseJson(text: string) {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned) as {
      answer: string;
      citations: { law: string; article: string; summary: string }[];
    };
  } catch {
    return null;
  }
}
