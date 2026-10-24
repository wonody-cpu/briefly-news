const GNEWS_URL = "https://gnews.io/api/v4/top-headlines";
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();
const BLOCKED_SOURCES = new Set(["gamegpu"]);

export const CATEGORIES = {
  general: { label: "주요 뉴스", apiCategory: "general" },
  business: { label: "비즈니스·브랜드", apiCategory: "business" },
  technology: { label: "기술·AI", apiCategory: "technology" },
  entertainment: { label: "문화·콘텐츠", apiCategory: "entertainment" },
  science: { label: "과학", apiCategory: "science" }
};

export function deriveTitle(article) {
  const title = (article.title || "").trim();
  const source = (article.source?.name || "").trim();
  const isGeneric = !title || title === source || /^(KBS|MBC|SBS|YTN|JTBC)( 뉴스)?$/i.test(title);

  if (!isGeneric || (!article.description && !article.content)) return title || "제목 없는 기사";

  const embeddedHeadline = article.content?.match(/기사 본문 영역\s*([\s\S]*?)\s*읽어주기 기능은/);
  if (embeddedHeadline?.[1]) return embeddedHeadline[1].replace(/\s+/g, " ").trim();

  return deriveSummary(article.description, article.content);
}

export function deriveSummary(description, content = "") {
  if (!description && !content) return "기사 원문에서 자세한 내용을 확인해 보세요.";

  const descriptionText = (description || "").trim();
  const descriptionIsTruncated = /(\.\.\.|…)$/.test(descriptionText);
  let sourceText = descriptionIsTruncated && content ? content : (description || content);
  if (descriptionIsTruncated && content) {
    const descriptionPrefix = descriptionText.replace(/(\.\.\.|…)$/, "").trim();
    const prefixIndex = content.indexOf(descriptionPrefix);
    if (prefixIndex >= 0) sourceText = content.slice(prefixIndex);
  }
  const cleaned = sourceText
    .replace(/\s*\[\d+ chars\]\s*$/, "")
    .replace(/^기사 본문 영역\s*/, "")
    .replace(/읽어주기 기능은 크롬기반의 브라우저에서만 사용하실 수 있습니다\.\s*/g, "")
    .replace(/^\[[^\]]{1,40}\]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentenceEnd = cleaned.search(/[.!?。]/);
  return sentenceEnd >= 25 ? cleaned.slice(0, sentenceEnd + 1) : cleaned;
}

export function normalizeArticle(article) {
  return {
    id: article.url,
    title: deriveTitle(article),
    description: article.description || "기사 설명이 제공되지 않았습니다.",
    summary: deriveSummary(article.description, article.content),
    url: article.url,
    image: article.image || null,
    publishedAt: article.publishedAt,
    source: article.source?.name || "출처 미상"
  };
}

export function isAllowedSource(article) {
  const source = article.source?.name?.trim().toLocaleLowerCase("en-US");
  return !source || !BLOCKED_SOURCES.has(source);
}

export async function getNews({ category = "general", apiKey, fetchImpl = fetch }) {
  if (!apiKey) {
    const error = new Error("GNEWS_API_KEY가 설정되지 않았습니다.");
    error.status = 503;
    throw error;
  }

  const selected = CATEGORIES[category] || CATEGORIES.general;
  const cacheKey = category;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const params = new URLSearchParams({
    category: selected.apiCategory,
    lang: "ko",
    max: "10",
    nullable: "image,description"
  });

  const response = await fetchImpl(`${GNEWS_URL}?${params}`, {
    headers: { "X-Api-Key": apiKey }
  });

  if (!response.ok) {
    const upstream = await response.json().catch(() => ({}));
    const error = new Error(upstream.errors?.[0] || "뉴스를 불러오지 못했습니다.");
    error.status = response.status === 401 ? 500 : response.status;
    throw error;
  }

  const result = await response.json();
  const data = {
    category,
    categoryLabel: selected.label,
    articles: (result.articles || []).filter(isAllowedSource).map(normalizeArticle),
    fetchedAt: new Date().toISOString(),
    cached: false
  };

  cache.set(cacheKey, { savedAt: Date.now(), data });
  return data;
}

