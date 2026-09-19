const manifest = window.STUDY_MANIFEST || [];
const bookSelect = document.querySelector("#book-select");
const chapterSelect = document.querySelector("#chapter-select");
const chapterList = document.querySelector("#chapter-list");
const note = document.querySelector("#study-note");
const title = document.querySelector("#study-title");
const subtitle = document.querySelector("#study-subtitle");
const breadcrumb = document.querySelector("#study-breadcrumb");
const previousButton = document.querySelector("#previous-chapter");
const nextButton = document.querySelector("#next-chapter");
const params = new URLSearchParams(window.location.search);
const requestedBook = params.get("book");
let activeBook = manifest.find(book => book.name === requestedBook) || manifest[0];
let activeChapter = Math.max(1, Number(params.get("chapter")) || 1);
let chapters = [];
let loadSequence = 0;

function escapeHtml(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function paragraphMarkup(text) {
  const safe = escapeHtml(text);
  if (text.startsWith("### ")) return `<h4>${escapeHtml(text.slice(4))}</h4>`;
  if (text.startsWith("## ")) return `<h3>${escapeHtml(text.slice(3))}</h3>`;
  if (text.startsWith("# ")) return `<h3>${escapeHtml(text.slice(2))}</h3>`;
  if (text.startsWith("▶")) return `<p class="study-highlight">${escapeHtml(text.replace(/^▶\s*/, ""))}</p>`;
  if (/^(?:•|[-*]|\d+[.)]|[①②③④⑤⑥⑦⑧⑨⑩])\s*/.test(text)) return `<p class="study-point">${safe}</p>`;
  return `<p>${safe}</p>`;
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("book", activeBook.name);
  url.searchParams.set("chapter", String(activeChapter));
  history.replaceState({}, "", url);
}

function renderBookSelect() {
  bookSelect.innerHTML = manifest.map(book =>
    `<option value="${book.number}"${book.number === activeBook.number ? " selected" : ""}>${book.name}（${book.chapters}章）</option>`
  ).join("");
}

function renderChapterControls() {
  if (!chapters.some(chapter => chapter.number === activeChapter)) activeChapter = 1;
  chapterSelect.innerHTML = chapters.map(chapter =>
    `<option value="${chapter.number}"${chapter.number === activeChapter ? " selected" : ""}>第${chapter.number}章</option>`
  ).join("");
  chapterList.innerHTML = chapters.map(chapter =>
    `<button type="button" data-chapter="${chapter.number}" class="${chapter.number === activeChapter ? "active" : ""}" aria-current="${chapter.number === activeChapter ? "page" : "false"}">${chapter.number}</button>`
  ).join("");
}

function renderChapter(scroll = false) {
  const index = chapters.findIndex(chapter => chapter.number === activeChapter);
  const chapter = chapters[index] || chapters[0];
  if (!chapter) return;
  activeChapter = chapter.number;
  breadcrumb.textContent = `${activeBook.name} · 第${chapter.number}章`;
  title.textContent = chapter.title;
  subtitle.textContent = chapter.subtitle;
  note.innerHTML = chapter.paragraphs.map(paragraphMarkup).join("");
  previousButton.disabled = index <= 0;
  nextButton.disabled = index >= chapters.length - 1;
  chapterSelect.value = String(activeChapter);
  chapterList.querySelectorAll("button").forEach(button => {
    const current = Number(button.dataset.chapter) === activeChapter;
    button.classList.toggle("active", current);
    button.setAttribute("aria-current", current ? "page" : "false");
  });
  syncUrl();
  if (scroll) document.querySelector("#study-content").scrollIntoView({behavior: "smooth", block: "start"});
}

async function loadBook(book, requestedChapter = 1, scroll = false) {
  const sequence = ++loadSequence;
  activeBook = book;
  activeChapter = requestedChapter;
  renderBookSelect();
  bookSelect.disabled = true;
  chapterSelect.disabled = true;
  previousButton.disabled = true;
  nextButton.disabled = true;
  breadcrumb.textContent = `${book.name} · 正在载入`;
  title.textContent = book.name;
  subtitle.textContent = "";
  chapterList.innerHTML = "";
  note.innerHTML = '<p class="study-loading">正在载入逐章研读内容…</p>';
  try {
    const response = await fetch(book.file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (sequence !== loadSequence) return;
    chapters = payload.chapters;
    renderChapterControls();
    renderChapter(scroll);
  } catch (error) {
    if (sequence !== loadSequence) return;
    note.innerHTML = '<p class="study-error">内容暂时无法载入。请检查网络后刷新页面。</p>';
    console.error("Unable to load study data", error);
  } finally {
    if (sequence === loadSequence) {
      bookSelect.disabled = false;
      chapterSelect.disabled = false;
    }
  }
}

bookSelect.addEventListener("change", () => {
  const selected = manifest.find(book => book.number === Number(bookSelect.value));
  if (selected) loadBook(selected, 1, true);
});
chapterSelect.addEventListener("change", () => {
  activeChapter = Number(chapterSelect.value);
  renderChapter(true);
});
chapterList.addEventListener("click", event => {
  const button = event.target.closest("button[data-chapter]");
  if (!button) return;
  activeChapter = Number(button.dataset.chapter);
  renderChapter(true);
});
previousButton.addEventListener("click", () => {
  const index = chapters.findIndex(chapter => chapter.number === activeChapter);
  if (index > 0) { activeChapter = chapters[index - 1].number; renderChapter(true); }
});
nextButton.addEventListener("click", () => {
  const index = chapters.findIndex(chapter => chapter.number === activeChapter);
  if (index < chapters.length - 1) { activeChapter = chapters[index + 1].number; renderChapter(true); }
});

if (activeBook) {
  renderBookSelect();
  loadBook(activeBook, activeChapter);
} else {
  note.innerHTML = '<p class="study-error">未找到研读内容。</p>';
}
