import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "src", "data", "law");

function loadEnvFile() {
  const envPath = path.join(projectRoot, ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const lawFiles = [
  path.join(dataDir, "labor-law.txt"),
  path.join(dataDir, "labor-contract-law.txt"),
].filter((filePath) => existsSync(filePath));

function detectLawId(name) {
  if (name.includes("劳动合同法")) return "labor-contract-law";
  if (name.includes("劳动法")) return "labor-law";
  return name.replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function parseArticles(text) {
  const cleaned = text.replace(/\r/g, "");
  const matches = [...cleaned.matchAll(/第[一二三四五六七八九十百千零〇0-9]+条/g)];
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? cleaned.length;
    const content = cleaned.slice(start, end).trim();
    const summary = content.replace(/\s+/g, " ").slice(0, 120);
    return {
      articleNo: match[0],
      content,
      summary,
    };
  });
}

async function buildIndex() {
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1",
  });

  const articles = [];

  for (const filePath of lawFiles) {
    const text = readFileSync(filePath, "utf8");
    const firstLine = text.split(/\n/).find((line) => line.trim())?.trim() ?? "未知法律";
    const lawId = detectLawId(firstLine);
    const lawName = firstLine;
    const parsed = parseArticles(text);

    for (const item of parsed) {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: item.content,
      });

      articles.push({
        id: `${lawId}-${item.articleNo}`,
        lawId,
        lawName,
        articleNo: item.articleNo,
        content: item.content,
        summary: item.summary,
        embedding,
      });
    }
  }

  const output = { articles, generatedAt: new Date().toISOString() };
  const outputPath = path.join(dataDir, "law.index.json");
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Saved ${articles.length} articles to ${outputPath}`);
}

buildIndex().catch((err) => {
  console.error(err);
  process.exit(1);
});
