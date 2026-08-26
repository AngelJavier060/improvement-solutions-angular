#!/usr/bin/env python3
"""Fase C: quitar ROLE_USER de @PreAuthorize en metodos de escritura."""
import re
from pathlib import Path

ROOT = Path(r"D:\PROGRAMAS 2025 CONTRUCCION\improvement-solutions-angular\backend\src\main\java")

PAT_BEFORE = re.compile(
    r'(@PreAuthorize\("(?:[^"]*)"\)\s*\n)(\s*@(?:Post|Put|Patch|Delete)Mapping)',
    re.MULTILINE,
)

PAT_AFTER = re.compile(
    r'(@(?:Post|Put|Patch|Delete)Mapping(?:\([^)]*\))?\s*\n)'
    r'((?:\s*@[A-Za-z]+(?:\([^)]*\))?\s*\n)*)'
    r'(\s*@PreAuthorize\("(?:[^"]*)"\))',
    re.MULTILINE,
)


def scrub_write_annotation(ann: str) -> str:
    new_ann = ann
    new_ann = new_ann.replace("hasAnyRole('ADMIN','USER')", "hasAnyRole('SUPER_ADMIN','ADMIN')")
    new_ann = new_ann.replace("hasAnyRole('ADMIN', 'USER')", "hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    new_ann = new_ann.replace(", 'ROLE_USER'", "")
    new_ann = new_ann.replace(", 'USER'", "")
    new_ann = new_ann.replace("'ROLE_USER', ", "")
    new_ann = new_ann.replace("'USER', ", "")
    return new_ann


def main() -> None:
    changed = []
    for path in ROOT.rglob("*Controller.java"):
        text = path.read_text(encoding="utf-8")
        original = text

        def repl_before(m: re.Match) -> str:
            return scrub_write_annotation(m.group(1)) + m.group(2)

        text = PAT_BEFORE.sub(repl_before, text)

        def repl_after(m: re.Match) -> str:
            return m.group(1) + m.group(2) + scrub_write_annotation(m.group(3))

        text = PAT_AFTER.sub(repl_after, text)

        if text != original:
            path.write_text(text, encoding="utf-8")
            changed.append(str(path.relative_to(ROOT)))

    print(f"Updated {len(changed)} files")
    for c in changed:
        print(f" - {c}")


if __name__ == "__main__":
    main()
