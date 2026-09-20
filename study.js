const manifest = window.STUDY_MANIFEST || [];
const englishBookNames = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew",
  "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
  "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter",
  "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];
const bookSelect = document.querySelector("#book-select");
const chapterSelect = document.querySelector("#chapter-select");
const chapterList = document.querySelector("#chapter-list");
const note = document.querySelector("#study-note");
const title = document.querySelector("#study-title");
const subtitle = document.querySelector("#study-subtitle");
const breadcrumb = document.querySelector("#study-breadcrumb");
const previousButton = document.querySelector("#previous-chapter");
const nextButton = document.querySelector("#next-chapter");
const sidebar = document.querySelector("#study-sidebar");
const menuToggle = document.querySelector("#study-menu-toggle");
const mobileMenuToggle = document.querySelector("#mobile-study-menu");
const menuClose = document.querySelector("#study-menu-close");
const menuBackdrop = document.querySelector("#study-menu-backdrop");
const mobilePreviousButton = document.querySelector("#mobile-previous-chapter");
const mobileNextButton = document.querySelector("#mobile-next-chapter");
const mobileCurrentBook = document.querySelector("#mobile-current-book");
const mobileCurrentChapter = document.querySelector("#mobile-current-chapter");
const mobileMedia = window.matchMedia("(max-width: 900px)");
const params = new URLSearchParams(window.location.search);
const requestedBook = params.get("book");
let activeBook = manifest.find(book => book.name === requestedBook) || manifest[0];
let activeChapter = Math.max(1, Number(params.get("chapter")) || 1);
let chapters = [];
let loadSequence = 0;
let menuOpen = false;
let menuReturnTarget = null;

function displayBookName(book) {
  if (!book) return "";
  const englishName = englishBookNames[book.number - 1];
  return englishName ? `${book.name} (${englishName})` : book.name;
}

function updateMenuState() {
  const openOnMobile = menuOpen && mobileMedia.matches;
  sidebar.classList.toggle("is-open", openOnMobile);
  menuBackdrop.hidden = !openOnMobile;
  document.body.classList.toggle("study-menu-open", openOnMobile);
  menuToggle.setAttribute("aria-expanded", String(openOnMobile));
  mobileMenuToggle.setAttribute("aria-expanded", String(openOnMobile));
  if (mobileMedia.matches && !openOnMobile) sidebar.setAttribute("inert", "");
  else sidebar.removeAttribute("inert");
}

function openStudyMenu(trigger) {
  if (!mobileMedia.matches) return;
  menuReturnTarget = trigger || document.activeElement;
  menuOpen = true;
  updateMenuState();
  requestAnimationFrame(() => sidebar.focus());
}

function closeStudyMenu(restoreFocus = false) {
  const returnTarget = menuReturnTarget;
  menuOpen = false;
  updateMenuState();
  if (restoreFocus && returnTarget instanceof HTMLElement) returnTarget.focus();
}

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
    `<option value="${book.number}"${book.number === activeBook.number ? " selected" : ""}>${displayBookName(book)}（${book.chapters}章）</option>`
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
  const activeBookName = displayBookName(activeBook);
  breadcrumb.textContent = `${activeBookName} · 第${chapter.number}章`;
  title.textContent = chapter.title;
  subtitle.textContent = chapter.subtitle;
  note.innerHTML = chapter.paragraphs.map(paragraphMarkup).join("");
  previousButton.disabled = index <= 0;
  nextButton.disabled = index >= chapters.length - 1;
  mobilePreviousButton.disabled = index <= 0;
  mobileNextButton.disabled = index >= chapters.length - 1;
  mobileCurrentBook.textContent = activeBookName;
  mobileCurrentChapter.textContent = `第${chapter.number}章`;
  chapterSelect.value = String(activeChapter);
  chapterList.querySelectorAll("button").forEach(button => {
    const current = Number(button.dataset.chapter) === activeChapter;
    button.classList.toggle("active", current);
    button.setAttribute("aria-current", current ? "page" : "false");
  });
  syncUrl();
  document.title = `${activeBookName} 第${chapter.number}章｜圣经脉络`;
  if (scroll) requestAnimationFrame(() => {
    const content = document.querySelector("#study-content");
    content.scrollIntoView({behavior: "smooth", block: "start"});
    if (mobileMedia.matches) content.focus({preventScroll: true});
  });
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
  mobilePreviousButton.disabled = true;
  mobileNextButton.disabled = true;
  const activeBookName = displayBookName(book);
  breadcrumb.textContent = `${activeBookName} · 正在载入`;
  title.textContent = activeBookName;
  subtitle.textContent = "";
  mobileCurrentBook.textContent = activeBookName;
  mobileCurrentChapter.textContent = "正在载入";
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
  if (selected) {
    closeStudyMenu();
    loadBook(selected, 1, true);
  }
});
chapterSelect.addEventListener("change", () => {
  activeChapter = Number(chapterSelect.value);
  closeStudyMenu();
  renderChapter(true);
});
chapterList.addEventListener("click", event => {
  const button = event.target.closest("button[data-chapter]");
  if (!button) return;
  activeChapter = Number(button.dataset.chapter);
  closeStudyMenu();
  renderChapter(true);
});

function goToPreviousChapter() {
  const index = chapters.findIndex(chapter => chapter.number === activeChapter);
  if (index > 0) { activeChapter = chapters[index - 1].number; renderChapter(true); }
}

function goToNextChapter() {
  const index = chapters.findIndex(chapter => chapter.number === activeChapter);
  if (index < chapters.length - 1) { activeChapter = chapters[index + 1].number; renderChapter(true); }
}

previousButton.addEventListener("click", goToPreviousChapter);
nextButton.addEventListener("click", goToNextChapter);
mobilePreviousButton.addEventListener("click", goToPreviousChapter);
mobileNextButton.addEventListener("click", goToNextChapter);
menuToggle.addEventListener("click", () => openStudyMenu(menuToggle));
mobileMenuToggle.addEventListener("click", () => openStudyMenu(mobileMenuToggle));
menuClose.addEventListener("click", () => closeStudyMenu(true));
menuBackdrop.addEventListener("click", () => closeStudyMenu(true));
document.addEventListener("keydown", event => {
  if (!menuOpen) return;
  if (event.key === "Escape") {
    closeStudyMenu(true);
    return;
  }
  if (event.key === "Tab") {
    const focusable = [...sidebar.querySelectorAll('button:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sidebar)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
mobileMedia.addEventListener("change", () => {
  menuOpen = false;
  updateMenuState();
});

updateMenuState();

if (activeBook) {
  renderBookSelect();
  loadBook(activeBook, activeChapter);
} else {
  note.innerHTML = '<p class="study-error">未找到研读内容。</p>';
}
