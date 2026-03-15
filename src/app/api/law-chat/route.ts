import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai, AI_MODEL } from "@/lib/ai";
import { LAW_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

interface LawArticle {
  id: string;
  lawId: string;
  lawName: string;
  articleNo: string;
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

function extractTokens(text: string) {
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
    for (let size = 2; size <= 3; size += 1) {
      for (let i = 0; i <= match.length - size; i += 1) {
        tokens.add(match.slice(i, i + size));
      }
    }
  }
  return Array.from(tokens).slice(0, 20);
}

function fallbackSearch(question: string, articles: LawArticle[]) {
  const tokens = extractTokens(question);
  if (tokens.length === 0) return articles.slice(0, 3);

  const preferContractLaw = question.includes("合同");
  const scored = articles
    .map((article) => {
      let score = 0;
      for (const token of tokens) {
        if (article.content.includes(token)) {
          score += token.length >= 3 ? 2 : 1;
        }
      }
      if (preferContractLaw && article.lawName.includes("劳动合同法")) {
        score += 1;
      }
      return { article, score };
    })
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 4)
    .map((item) => item.article);

  return scored.length > 0 ? scored : articles.slice(0, 4);
}

function buildContext(articles: LawArticle[]) {
  return articles
    .map((article) => {
      return [
        `${article.lawName} ${article.articleNo}`,
        `摘要：${article.summary}`,
        `原文：${article.content}`,
      ].join("\n");
    })
    .join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body as { question?: string };

    if (!question || question.trim().length < 5) {
      return NextResponse.json(
        { error: "问题过短，请补充细节", code: "INPUT_TOO_SHORT" },
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

    const withEmbeddings = articles.filter(
      (article) => Array.isArray(article.embedding) && article.embedding.length > 0
    );

    let topArticles: LawArticle[] = [];

    if (withEmbeddings.length > 0) {
      const { embedding } = await generateTextEmbedding(question);
      const scored = withEmbeddings
        .map((article) => ({
          article,
          score: cosineSimilarity(embedding, article.embedding ?? []),
        }))
        .sort((a, b) => b.score - a.score);

      topArticles = scored.slice(0, 4).map((item) => item.article);

      if (scored[0]?.score !== undefined && scored[0].score < 0.2) {
        topArticles = fallbackSearch(question, articles);
      }
    } else {
      topArticles = fallbackSearch(question, articles);
    }

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
      maxOutputTokens: 1000,
      temperature: 0.2,
    });

    const parsed = safeParseJson(text);
    const fallbackCitations = topArticles.slice(0, 3).map((article) => ({
      law: article.lawName,
      article: article.articleNo,
      summary: article.summary,
    }));

    const responseBody = {
      answer: parsed?.answer ?? text,
      citations:
        parsed?.citations && parsed.citations.length > 0
          ? parsed.citations.slice(0, 3)
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
