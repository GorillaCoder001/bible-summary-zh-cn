#!/usr/bin/env python3
"""Build per-book study JSON and a lightweight browser manifest from SQLite."""

import argparse
import html
import json
import re
import sqlite3
from pathlib import Path


BOOKS = [
    ("创世记", "genesis", 50), ("出埃及记", "exodus", 40), ("利未记", "leviticus", 27),
    ("民数记", "numbers", 36), ("申命记", "deuteronomy", 34), ("约书亚记", "joshua", 24),
    ("士师记", "judges", 21), ("路得记", "ruth", 4), ("撒母耳记上", "1-samuel", 31),
    ("撒母耳记下", "2-samuel", 24), ("列王纪上", "1-kings", 22), ("列王纪下", "2-kings", 25),
    ("历代志上", "1-chronicles", 29), ("历代志下", "2-chronicles", 36), ("以斯拉记", "ezra", 10),
    ("尼希米记", "nehemiah", 13), ("以斯帖记", "esther", 10), ("约伯记", "job", 42),
    ("诗篇", "psalms", 150), ("箴言", "proverbs", 31), ("传道书", "ecclesiastes", 12),
    ("雅歌", "song-of-songs", 8), ("以赛亚书", "isaiah", 66), ("耶利米书", "jeremiah", 52),
    ("耶利米哀歌", "lamentations", 5), ("以西结书", "ezekiel", 48), ("但以理书", "daniel", 12),
    ("何西阿书", "hosea", 14), ("约珥书", "joel", 3), ("阿摩司书", "amos", 9),
    ("俄巴底亚书", "obadiah", 1), ("约拿书", "jonah", 4), ("弥迦书", "micah", 7),
    ("那鸿书", "nahum", 3), ("哈巴谷书", "habakkuk", 3), ("西番雅书", "zephaniah", 3),
    ("哈该书", "haggai", 2), ("撒迦利亚书", "zechariah", 14), ("玛拉基书", "malachi", 4),
    ("马太福音", "matthew", 28), ("马可福音", "mark", 16), ("路加福音", "luke", 24),
    ("约翰福音", "john", 21), ("使徒行传", "acts", 28), ("罗马书", "romans", 16),
    ("哥林多前书", "1-corinthians", 16), ("哥林多后书", "2-corinthians", 13),
    ("加拉太书", "galatians", 6), ("以弗所书", "ephesians", 6), ("腓立比书", "philippians", 4),
    ("歌罗西书", "colossians", 4), ("帖撒罗尼迦前书", "1-thessalonians", 5),
    ("帖撒罗尼迦后书", "2-thessalonians", 3), ("提摩太前书", "1-timothy", 6),
    ("提摩太后书", "2-timothy", 4), ("提多书", "titus", 3), ("腓利门书", "philemon", 1),
    ("希伯来书", "hebrews", 13), ("雅各书", "james", 5), ("彼得前书", "1-peter", 5),
    ("彼得后书", "2-peter", 3), ("约翰一书", "1-john", 5), ("约翰二书", "2-john", 1),
    ("约翰三书", "3-john", 1), ("犹大书", "jude", 1), ("启示录", "revelation", 22),
]


def clean_content(raw):
    text = html.unescape(raw or "")
    text = re.sub(r'<ref\b[^>]*>(.*?)</ref>', r'\1', text, flags=re.I | re.S)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = text.replace('`', '')
    lines = []
    for raw_line in text.split('\n'):
        line = raw_line.strip()
        if not line or re.fullmatch(r'[-—=_*]{3,}', line):
            continue
        if line.startswith('✅') or re.match(r'^(如果你愿意|如你愿意|需要我|要不要我|我也可以)', line):
            break
        if re.match(r'^(好的|当然)[，,!！]', line) and ('将' in line or '下面' in line or '以下' in line):
            continue
        line = re.sub(r'^#+\s*', lambda m: '#' * len(m.group(0).strip()) + ' ', line)
        line = re.sub(r'^[-*]\s+', '• ', line)
        line = re.sub(r'^\s*---+\s*$', '', line)
        if line:
            lines.append(line)
    return lines


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('database', type=Path)
    parser.add_argument('site_root', type=Path)
    args = parser.parse_args()

    output_dir = args.site_root / 'data' / 'books'
    output_dir.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(args.database)
    rows = connection.execute('SELECT Book, Chapter, Content FROM Summary ORDER BY Book, Chapter').fetchall()
    connection.close()

    if len(rows) != 1189:
        raise SystemExit(f'Expected 1189 chapters, found {len(rows)}')

    by_book = {}
    for book_number, chapter_number, content in rows:
        by_book.setdefault(book_number, []).append((chapter_number, content))

    if sorted(by_book) != list(range(1, 67)):
        raise SystemExit('Database does not contain exactly books 1–66')

    manifest = []
    for book_number, (name, slug, expected_chapters) in enumerate(BOOKS, 1):
        source_chapters = by_book[book_number]
        chapter_numbers = [chapter for chapter, _ in source_chapters]
        if chapter_numbers != list(range(1, expected_chapters + 1)):
            raise SystemExit(f'Chapter sequence mismatch for {name}: {chapter_numbers}')
        chapters = []
        for chapter_number, content in source_chapters:
            paragraphs = clean_content(content)
            if not paragraphs:
                raise SystemExit(f'Empty content for {name} {chapter_number}')
            chapters.append({
                'number': chapter_number,
                'title': f'{name} 第{chapter_number}章',
                'subtitle': '经文概览、结构、背景、神学信息与生活应用',
                'paragraphs': paragraphs,
            })
        filename = f'{book_number:02d}-{slug}.json'
        payload = {'book': name, 'chapters': chapters}
        (output_dir / filename).write_text(
            json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8'
        )
        manifest.append({
            'number': book_number, 'name': name, 'slug': slug,
            'chapters': expected_chapters, 'file': f'data/books/{filename}',
        })

    manifest_text = 'window.STUDY_MANIFEST=' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (args.site_root / 'study-data.js').write_text(manifest_text, encoding='utf-8')
    print(f'Built {len(manifest)} books and {sum(item[2] for item in BOOKS)} chapters.')


if __name__ == '__main__':
    main()
