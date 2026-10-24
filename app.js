const STORAGE_KEY = "briefly-bookmarks-v1";

const state = {
  category: "general",
  keyword: "",
  source: "all",
  articles: [],
  bookmarks: loadBookmarks(),
  savedOnly: false,
  requestId: 0
};

const elements = {
  categories: document.querySelector("#categories"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  newsGrid: document.querySelector("#newsGrid"),
  status: document.querySelector("#status"),
  updateTime: document.querySelector("#updateTime"),
  savedButton: document.querySelector("#savedButton"),
  savedCount: document.querySelector("#savedCount"),
  feedTitle: document.querySelector("#feedTitle"),
  backToNewsButton: document.querySelector("#backToNewsButton"),
  sourceFilter: document.querySelector("#sourceFilter"),
  skeletonTemplate: document.querySelector("#skeletonTemplate")
};

function loadBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return new Map();
    return new Map(saved
      .filter((article) => article?.id && article?.url && article.source?.toLocaleLowerCase("en-US") !== "gamegpu")
      .map((article) => [article.id, article]));
  } catch {
    return new Map();
  }
}

function saveBookmarks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.bookmarks.values()]));
  elements.savedCount.textContent = state.bookmarks.size;
}

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "날짜 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function showLoading() {
  elements.status.className = "status";
  elements.newsGrid.replaceChildren();
  for (let index = 0; index < 6; index += 1) {
    elements.newsGrid.append(elements.skeletonTemplate.content.cloneNode(true));
  }
  elements.updateTime.textContent = "뉴스를 불러오는 중";
}

function showStatus(title, message, retry = false) {
  elements.newsGrid.replaceChildren();
  elements.status.className = "status is-visible";
  elements.status.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${retry ? '<button type="button" id="retryButton">다시 시도</button>' : ""}`;
  document.querySelector("#retryButton")?.addEventListener("click", fetchNews);
}

function articleCard(article) {
  const card = document.createElement("article");
  const saved = state.bookmarks.has(article.id);
  card.className = "news-card";
  card.innerHTML = `
    <div class="card-image">
      ${article.image
        ? `<img src="${escapeHtml(article.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : '<div class="image-fallback" aria-hidden="true">B</div>'}
      <button class="bookmark ${saved ? "is-saved" : ""}" type="button" aria-label="${saved ? "북마크에서 제거" : "북마크에 저장"}" aria-pressed="${saved}">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6.5 4.75A1.75 1.75 0 0 1 8.25 3h7.5a1.75 1.75 0 0 1 1.75 1.75v16l-5.5-3.5-5.5 3.5v-16Z"/></svg>
      </button>
    </div>
    <div class="card-body">
      <div class="card-meta"><span class="source">${escapeHtml(article.source)}</span><time>${escapeHtml(formatDate(article.publishedAt))}</time></div>
      <h3><a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h3>
      <div class="summary">
        <span>핵심 한 줄</span>
        <p>${escapeHtml(article.summary || article.description)}</p>
      </div>
      <a class="read-link" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">기사 원문 읽기 ↗</a>
    </div>`;

  const image = card.querySelector("img");
  image?.addEventListener("error", () => {
    image.replaceWith(Object.assign(document.createElement("div"), { className: "image-fallback", textContent: "B" }));
  }, { once: true });

  card.querySelector(".bookmark").addEventListener("click", () => toggleBookmark(article));
  return card;
}

function renderArticles() {
  const keyword = state.keyword.toLocaleLowerCase("ko-KR");
  const sourceArticles = state.savedOnly ? [...state.bookmarks.values()] : state.articles;
  updateSourceOptions(sourceArticles);
  const keywordFiltered = keyword
    ? sourceArticles.filter((article) => `${article.title} ${article.description}`.toLocaleLowerCase("ko-KR").includes(keyword))
    : sourceArticles;
  const articles = state.source === "all"
    ? keywordFiltered
    : keywordFiltered.filter((article) => article.source === state.source);
  elements.status.className = "status";
  elements.newsGrid.replaceChildren();
  elements.savedButton.setAttribute("aria-pressed", String(state.savedOnly));
  elements.savedCount.textContent = state.bookmarks.size;
  elements.feedTitle.textContent = state.savedOnly ? "저장한 기사" : "오늘의 브리핑";
  elements.backToNewsButton.classList.toggle("is-hidden", !state.savedOnly);
  elements.categories.classList.toggle("is-hidden", state.savedOnly);
  elements.searchInput.placeholder = state.savedOnly ? "저장한 기사에서 검색해 보세요" : "관심 키워드를 검색해 보세요";

  if (!articles.length) {
    const title = state.savedOnly ? "아직 저장한 기사가 없어요" : "검색 결과가 없어요";
    const message = state.savedOnly ? "관심 있는 기사의 북마크 버튼을 눌러 모아보세요." : "다른 키워드나 카테고리를 선택해 보세요.";
    showStatus(title, message);
    return;
  }

  const fragment = document.createDocumentFragment();
  articles.forEach((article) => fragment.append(articleCard(article)));
  elements.newsGrid.append(fragment);
}

function updateSourceOptions(articles) {
  const sources = [...new Set(articles.map((article) => article.source).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));
  if (state.source !== "all" && !sources.includes(state.source)) state.source = "all";
  elements.sourceFilter.replaceChildren(new Option("전체 출처", "all"));
  sources.forEach((source) => elements.sourceFilter.add(new Option(source, source)));
  elements.sourceFilter.value = state.source;
}

function toggleBookmark(article) {
  if (state.bookmarks.has(article.id)) state.bookmarks.delete(article.id);
  else state.bookmarks.set(article.id, article);
  saveBookmarks();
  renderArticles();
}

async function fetchNews() {
  const currentRequest = ++state.requestId;
  state.savedOnly = false;
  showLoading();

  const params = new URLSearchParams({ category: state.category });

  try {
    const response = await fetch(`/api/news?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "뉴스 요청에 실패했습니다.");
    if (currentRequest !== state.requestId) return;
    state.articles = data.articles;
    let refreshedBookmark = false;
    state.articles.forEach((article) => {
      if (state.bookmarks.has(article.id)) {
        state.bookmarks.set(article.id, article);
        refreshedBookmark = true;
      }
    });
    if (refreshedBookmark) saveBookmarks();
    elements.updateTime.textContent = `${formatDate(data.fetchedAt)} 업데이트${data.cached ? " · 캐시" : ""}`;
    renderArticles();
  } catch (error) {
    if (currentRequest !== state.requestId) return;
    elements.updateTime.textContent = "업데이트 실패";
    const missingKey = error.message.includes("GNEWS_API_KEY");
    showStatus(
      missingKey ? "API 키 설정이 필요해요" : "뉴스를 불러오지 못했어요",
      missingKey ? ".env.local 파일에 발급받은 API 키를 입력해 주세요." : "잠시 후 다시 시도해 주세요. 문제가 계속되면 API 사용량을 확인해 주세요.",
      !missingKey
    );
  }
}

elements.categories.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button || state.savedOnly || button.dataset.category === state.category) return;
  state.category = button.dataset.category;
  state.source = "all";
  elements.categories.querySelectorAll("button").forEach((item) => item.setAttribute("aria-selected", String(item === button)));
  fetchNews();
});

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.keyword = elements.searchInput.value.trim();
  renderArticles();
  document.querySelector(".feed").scrollIntoView({ behavior: "smooth" });
});

elements.sourceFilter.addEventListener("change", () => {
  state.source = elements.sourceFilter.value;
  renderArticles();
});

elements.savedButton.addEventListener("click", () => {
  state.savedOnly = !state.savedOnly;
  if (state.savedOnly) {
    state.requestId += 1;
    state.keyword = "";
    state.source = "all";
    elements.searchInput.value = "";
    elements.updateTime.textContent = `${state.bookmarks.size}개의 저장된 기사`;
    renderArticles();
  } else {
    fetchNews();
  }
});

elements.backToNewsButton.addEventListener("click", () => {
  state.savedOnly = false;
  state.keyword = "";
  state.source = "all";
  elements.searchInput.value = "";
  fetchNews();
});

saveBookmarks();
fetchNews();

