import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "src", "data", "law");

const noEmbed = process.argv.includes("--no-embed");

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

// Load topic mappings
const topicsPath = path.join(dataDir, "law-topics.json");
const topicMap = JSON.parse(readFileSync(topicsPath, "utf8"));

const lawFiles = [
  path.join(dataDir, "labor-law.txt"),
  path.join(dataDir, "labor-contract-law.txt"),
].filter((filePath) => existsSync(filePath));

function detectLawId(name) {
  if (name.includes("劳动合同法")) return "labor-contract-law";
  if (name.includes("劳动法")) return "labor-law";
  return name.replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

// Chapter/section regex patterns
const chapterRe = /^[　\s]*(第[一二三四五六七八九十百]+章[　\s]+\S+.*?)$/;
const sectionRe = /^[　\s]*(第[一二三四五六七八九十百]+节[　\s]+\S+.*?)$/;

function parseArticlesWithChapters(text, lawId) {
  const cleaned = text.replace(/\r/g, "");
  const lines = cleaned.split("\n");

  // First pass: build a map of line positions to chapter/section
  const chapterMarkers = []; // { lineIndex, chapter, section }
  let currentChapter = "";
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const chMatch = line.match(chapterRe);
    if (chMatch) {
      currentChapter = chMatch[1].replace(/[　\s]+/g, "　").trim();
      currentSection = null;
      chapterMarkers.push({ lineIndex: i, chapter: currentChapter, section: currentSection });
      continue;
    }
    const secMatch = line.match(sectionRe);
    if (secMatch) {
      currentSection = secMatch[1].replace(/[　\s]+/g, "　").trim();
      chapterMarkers.push({ lineIndex: i, chapter: currentChapter, section: currentSection });
    }
  }

  // Second pass: parse articles and assign chapters
  const articleRe = /第[一二三四五六七八九十百千零〇0-9]+条/g;
  const matches = [...cleaned.matchAll(articleRe)];
  if (matches.length === 0) return [];

  // Find the character offset -> line index mapping
  function offsetToLineIndex(offset) {
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = pos + lines[i].length + 1; // +1 for \n
      if (offset < lineEnd) return i;
      pos = lineEnd;
    }
    return lines.length - 1;
  }

  // For each article, find which chapter/section it belongs to
  function getChapterForLine(lineIdx) {
    let chapter = "";
    let section = null;
    for (const marker of chapterMarkers) {
      if (marker.lineIndex <= lineIdx) {
        chapter = marker.chapter;
        section = marker.section;
      } else {
        break;
      }
    }
    return { chapter, section };
  }

  // Resolve topics for a chapter/section
  function resolveTopics(chapter, section) {
    const lawTopics = topicMap[lawId] || {};
    const topics = new Set();

    // Try section-level match first (for 劳动合同法 第五章)
    if (section && chapter) {
      const sectionKey = `${chapter} > ${section}`;
      if (lawTopics[sectionKey]) {
        for (const t of lawTopics[sectionKey]) topics.add(t);
      }
    }

    // Then chapter-level
    if (chapter) {
      // Try exact match first, then fuzzy
      if (lawTopics[chapter]) {
        for (const t of lawTopics[chapter]) topics.add(t);
      } else {
        // Fuzzy: match by chapter number
        const chNum = chapter.match(/第[一二三四五六七八九十百]+章/)?.[0];
        if (chNum) {
          for (const [key, val] of Object.entries(lawTopics)) {
            if (key.includes(chNum)) {
              for (const t of val) topics.add(t);
              break;
            }
          }
        }
      }
    }

    return Array.from(topics);
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? cleaned.length;
    const content = cleaned.slice(start, end).trim();
    const lineIdx = offsetToLineIndex(start);
    const { chapter, section } = getChapterForLine(lineIdx);
    const topics = resolveTopics(chapter, section);
    const summary = buildSummary(content);

    return {
      articleNo: match[0],
      content,
      summary,
      chapter,
      section,
      topics,
    };
  });
}

function buildSummary(content) {
  // Remove article number prefix
  let text = content.replace(/^第[一二三四五六七八九十百千零〇0-9]+条[　\s]*/, "").trim();
  // Normalize whitespace
  text = text.replace(/\s+/g, " ");

  // Count enumeration items
  const enumMatches = text.match(/（[一二三四五六七八九十]+）/g);
  const enumSuffix = enumMatches && enumMatches.length >= 2 ? `（含${enumMatches.length}项情形）` : "";

  // Take first sentence (up to first period)
  const periodIdx = text.indexOf("。");
  let summary;
  if (periodIdx !== -1 && periodIdx <= 120) {
    summary = text.slice(0, periodIdx + 1);
  } else {
    summary = text.slice(0, 100);
    // Truncate at last comma if over limit
    const lastComma = summary.lastIndexOf("，");
    if (lastComma > 30) {
      summary = summary.slice(0, lastComma) + "...";
    } else {
      summary = summary + "...";
    }
  }

  if (enumSuffix && !summary.includes("含") && summary.length + enumSuffix.length <= 150) {
    summary += enumSuffix;
  }

  return summary;
}

function buildCompositeText(article, lawName) {
  const parts = [`[章节] ${lawName}`];
  if (article.chapter) parts[0] += ` > ${article.chapter}`;
  if (article.section) parts[0] += ` > ${article.section}`;
  parts.push(`[法条] ${article.articleNo}`);
  if (article.topics.length > 0) {
    parts.push(`[主题] ${article.topics.join(", ")}`);
  }
  parts.push(`[摘要] ${article.summary}`);
  return parts.join("\n");
}

async function buildIndex() {
  let openai, embed;
  if (!noEmbed) {
    const { createOpenAI } = await import("@ai-sdk/openai");
    const ai = await import("ai");
    embed = ai.embed;
    openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1",
    });
  }

  const articles = [];

  for (const filePath of lawFiles) {
    const text = readFileSync(filePath, "utf8");
    const firstLine = text.split(/\n/).find((line) => line.trim())?.trim() ?? "未知法律";
    const lawId = detectLawId(firstLine);
    const lawName = firstLine.replace(/^[　\s]+/, "");
    const parsed = parseArticlesWithChapters(text, lawId);

    for (const item of parsed) {
      const article = {
        id: `${lawId}-${item.articleNo}`,
        lawId,
        lawName,
        articleNo: item.articleNo,
        chapter: item.chapter,
        section: item.section,
        topics: item.topics,
        content: item.content,
        summary: item.summary,
      };

      if (!noEmbed) {
        const compositeText = buildCompositeText(item, lawName);
        const result = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: compositeText,
        });
        article.embedding = result.embedding;
      }

      articles.push(article);
    }
  }

  const output = { articles, generatedAt: new Date().toISOString() };
  const outputPath = path.join(dataDir, "law.index.json");
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Saved ${articles.length} articles to ${outputPath}`);
  console.log(`  Chapters: ${new Set(articles.map((a) => a.chapter).filter(Boolean)).size}`);
  console.log(`  With topics: ${articles.filter((a) => a.topics.length > 0).length}`);
  console.log(`  With embeddings: ${articles.filter((a) => a.embedding).length}`);
}

buildIndex().catch((err) => {
  console.error(err);
  process.exit(1);
});
