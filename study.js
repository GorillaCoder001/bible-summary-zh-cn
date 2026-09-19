const data = window.STUDY_DATA || {};
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
const books = Object.keys(data);
let activeBook = books.includes(params.get("book")) ? params.get("book") : books[0];
let activeChapter = Number(params.get("chapter")) || data[activeBook]?.[0]?.number || 1;

const sectionPattern = /^(核心信息|核心信息总结|应用与反思|福音连接点|邻舍福音分享句|你可以这样向邻舍分享|你可以用这样的方式向邻舍分享)/;
const versePattern = /^\d{1,3}:\d{1,3}(?:\s*[–—-]\s*\d{1,3})?/;

function paragraphMarkup(text) {
  const safe = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  if (sectionPattern.test(text)) return `<h3>${safe.replace(/[：:]$/, "")}</h3>`;
  if (versePattern.test(text)) return `<h4>${safe}</h4>`;
  if (text.startsWith("▶")) return `<p class="study-highlight">${safe.replace(/^▶\s*/, "")}</p>`;
  if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(text)) return `<p class="study-point">${safe}</p>`;
  return `<p>${safe.replaceAll("\n", "<br />")}</p>`;
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("book", activeBook);
  url.searchParams.set("chapter", String(activeChapter));
  history.replaceState({}, "", url);
}

function renderBookControls() {
  bookSelect.innerHTML = books.map(book => `<option value="${book}"${book === activeBook ? " selected" : ""}>${book}（${data[book].length}章）</option>`).join("");
  const chapters = data[activeBook];
  if (!chapters.some(chapter => chapter.number === activeChapter)) activeChapter = chapters[0].number;
  chapterSelect.innerHTML = chapters.map(chapter => `<option value="${chapter.number}"${chapter.number === activeChapter ? " selected" : ""}>第${chapter.number}章</option>`).join("");
  chapterList.innerHTML = chapters.map(chapter => `<button type="button" data-chapter="${chapter.number}" class="${chapter.number === activeChapter ? "active" : ""}" aria-current="${chapter.number === activeChapter ? "page" : "false"}">${chapter.number}</button>`).join("");
}

function renderChapter(scroll = false) {
  const chapters = data[activeBook];
  const index = chapters.findIndex(chapter => chapter.number === activeChapter);
  const chapter = chapters[index] || chapters[0];
  activeChapter = chapter.number;
  breadcrumb.textContent = `${activeBook} · 第${chapter.number}章`;
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

bookSelect.addEventListener("change", () => {
  activeBook = bookSelect.value;
  activeChapter = data[activeBook][0].number;
  renderBookControls();
  renderChapter(true);
});
chapterSelect.addEventListener("change", () => { activeChapter = Number(chapterSelect.value); renderChapter(true); });
chapterList.addEventListener("click", event => {
  const button = event.target.closest("button[data-chapter]");
  if (!button) return;
  activeChapter = Number(button.dataset.chapter);
  renderChapter(true);
});
previousButton.addEventListener("click", () => {
  const chapters = data[activeBook];
  const index = chapters.findIndex(chapter => chapter.number === activeChapter);
  if (index > 0) { activeChapter = chapters[index - 1].number; renderChapter(true); }
});
nextButton.addEventListener("click", () => {
  const chapters = data[activeBook];
  const index = chapters.findIndex(chapter => chapter.number === activeChapter);
  if (index < chapters.length - 1) { activeChapter = chapters[index + 1].number; renderChapter(true); }
});

renderBookControls();
renderChapter();
