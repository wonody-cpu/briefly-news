import test from "node:test";
import assert from "node:assert/strict";
import { deriveSummary, deriveTitle, getNews, isAllowedSource, normalizeArticle } from "../lib/news.js";

test("normalizeArticle은 누락된 설명과 출처에 기본값을 사용한다", () => {
  const result = normalizeArticle({ title: "테스트", url: "https://example.com/a" });
  assert.equal(result.description, "기사 설명이 제공되지 않았습니다.");
  assert.equal(result.source, "출처 미상");
  assert.equal(result.id, "https://example.com/a");
});

test("API 키가 없으면 설정 오류를 반환한다", async () => {
  await assert.rejects(() => getNews({ apiKey: "" }), /GNEWS_API_KEY/);
});

test("방송사명이 제목으로 온 경우 설명에서 표시 제목을 만든다", () => {
  const title = deriveTitle({
    title: "KBS 뉴스",
    description: "인공지능 거품 우려로 투자자들의 안전자산 선호가 강해지고 있습니다. 자세한 소식입니다.",
    source: { name: "KBS 뉴스" }
  });
  assert.equal(title, "인공지능 거품 우려로 투자자들의 안전자산 선호가 강해지고 있습니다.");
});

test("기사 설명의 첫 문장을 자르지 않고 핵심 한 줄로 정리한다", () => {
  const summary = deriveSummary("[서울=뉴스] " + "새로운 정책의 주요 내용과 사회적 영향을 설명하는 문장입니다. ".repeat(4));
  assert.equal(summary, "새로운 정책의 주요 내용과 사회적 영향을 설명하는 문장입니다.");
  assert.doesNotMatch(summary, /^\[서울=뉴스\]/);
});

test("GameGPU 출처 기사는 목록에서 제외한다", () => {
  assert.equal(isAllowedSource({ source: { name: "GameGPU" } }), false);
  assert.equal(isAllowedSource({ source: { name: "KBS 뉴스" } }), true);
});

test("알 수 없는 카테고리는 주요 뉴스로 처리한다", async () => {
  let requestedUrl = "";
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return { ok: true, json: async () => ({ articles: [] }) };
  };
  const result = await getNews({ category: "unknown", apiKey: "test", fetchImpl });
  assert.equal(result.categoryLabel, "주요 뉴스");
  assert.match(requestedUrl, /category=general/);
});

