import json
import re
import sys
from pathlib import Path

from docx import Document


CHAPTER_RE = re.compile(r"^(创世记|马太福音|马可福音|路加福音)第(\d+)章概括[：:]?(.*)$")


def clean(text: str) -> str:
    text = text.replace("**", "").replace("\u00a0", " ")
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def extract(source: Path) -> dict:
    document = Document(source)
    books = {}
    current = None

    for paragraph in document.paragraphs:
        text = clean(paragraph.text)
        if not text:
            continue

        match = CHAPTER_RE.match(text)
        if match:
            book, chapter, subtitle = match.groups()
            current = {
                "number": int(chapter),
                "title": f"{book}第{chapter}章",
                "subtitle": subtitle.strip(" ：:"),
                "paragraphs": [],
            }
            books.setdefault(book, []).append(current)
            continue

        if current is not None:
            if text in {"旧约：", "旧约", "新约", "创世记 (Genesis)", "马太福音", "马可福音", "路加福音"}:
                continue
            current["paragraphs"].append(text)

    for chapters in books.values():
        chapters.sort(key=lambda item: item["number"])
    return books


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: extract_study_notes.py SOURCE.docx OUTPUT.js")
    source, output = map(Path, sys.argv[1:])
    data = extract(source)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    output.write_text(f"window.STUDY_DATA={payload};\n", encoding="utf-8")
    print(json.dumps({book: len(chapters) for book, chapters in data.items()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
