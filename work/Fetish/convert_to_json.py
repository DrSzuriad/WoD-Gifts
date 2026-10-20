"""Konwertuje pliki z work/Fetish/txt do data/fetishes.json.

Uruchomienie z katalogu projektu:

    python work/Fetish/convert_to_json.py

Sama kontrola danych, bez zapisywania pliku:

    python work/Fetish/convert_to_json.py --check

Skrypt zachowuje istniejące polskie tłumaczenia i pole ``requirement`` podczas
ponownego generowania tego samego przedmiotu. Nowe przedmioty otrzymują
``requirement: null``. Liczbowe rangi i Gnoza pozostają liczbami, wartości
złożone są zachowywane jako tekst, a brak danych jako ``null``. Tabele Markdown
są zamieniane na bloki ``table`` zgodne z formatem używanym przez stronę.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict, deque
from copy import deepcopy
from pathlib import Path
from typing import Any


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


SCRIPT_DIRECTORY = Path(__file__).resolve().parent
PROJECT_DIRECTORY = SCRIPT_DIRECTORY.parent.parent
DEFAULT_INPUT = SCRIPT_DIRECTORY / "txt"
DEFAULT_OUTPUT = PROJECT_DIRECTORY / "data" / "fetishes.json"

FILE_NAME_PREFIX = "WOD - Werewolf - The Apocalypse - "

ENTRY_PATTERN = re.compile(
    r"^###[ \t]+(?P<name>[^\r\n]+?)[ \t]*\r?\n"
    r"(?P<body>.*?)(?=^###[ \t]+|\Z)",
    re.MULTILINE | re.DOTALL,
)

DESCRIPTION_PATTERN = re.compile(
    r"^Pełny opis:[ \t]*\r?\n"
    r"(?P<description>.*?)"
    r"(?=^[ \t]*---[ \t]*\r?$|^##[ \t]+|\Z)",
    re.MULTILINE | re.DOTALL,
)

CATEGORY_MAP = {
    "fetysz": "Fetish",
    "fetish": "Fetish",
    "talen": "Talen",
    "unknown": "Unknown",
}

EDITION_NAMES = {
    "revised": "Revised",
    "revised edition": "Revised",
    "1st ed": "1st Ed.",
    "1st edition": "1st Ed.",
    "2nd ed": "2nd Ed.",
    "2nd edition": "2nd Ed.",
}

MISSING_VALUES = {
    "",
    "brak",
    "nie podano",
    "n/a",
    "null",
}


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Konwertuje wszystkie pliki .txt z katalogu Fetish/txt "
            "do wspólnego pliku JSON."
        )
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=DEFAULT_INPUT,
        help="Katalog z plikami .txt (domyślnie work/Fetish/txt).",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Sprawdź całą konwersję bez zapisywania pliku wynikowego.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Docelowy plik JSON (domyślnie data/fetishes.json).",
    )
    return parser.parse_args()


def read_field(body: str, label: str, source: str) -> str:
    match = re.search(
        rf"^{re.escape(label)}:[ \t]*(.*?)[ \t]*\r?$",
        body,
        re.MULTILINE,
    )

    if not match:
        raise ValueError(f"{source}: brak pola \"{label}\".")

    return match.group(1).strip()


def parse_rating(value: str) -> int | str | None:
    value = value.strip()
    if value.casefold() in MISSING_VALUES:
        return None

    return int(value) if re.fullmatch(r"[0-9]+", value) else value


def parse_category(value: str, source: str) -> str:
    category = CATEGORY_MAP.get(value.casefold())

    if category is None:
        allowed = ", ".join(sorted(set(CATEGORY_MAP.values())))
        raise ValueError(
            f"{source}: nieznana kategoria {value!r}. "
            f"Dozwolone kategorie: {allowed}."
        )

    return category


def source_from_name(name: str) -> tuple[str, str | None]:
    name = " ".join(name.replace("_", " ").split())

    if name.casefold().startswith(FILE_NAME_PREFIX.casefold()):
        name = name[len(FILE_NAME_PREFIX) :].strip()

    edition = None
    suffix = re.search(r"\s*\(([^()]+)\)$", name)
    if suffix:
        edition_key = suffix.group(1).strip().casefold().rstrip(".")
        edition = EDITION_NAMES.get(edition_key)
        if edition:
            name = name[:suffix.start()].strip()

    if not name:
        raise ValueError("Nie można ustalić nazwy podręcznika.")

    return name, edition


def split_table_row(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|") and not line.endswith("\\|"):
        line = line[:-1]

    return [
        cell.strip().replace("\\|", "|")
        for cell in re.split(r"(?<!\\)\|", line)
    ]


def is_table_separator(line: str) -> bool:
    return "|" in line and all(
        re.fullmatch(r":?-{3,}:?", cell)
        for cell in split_table_row(line)
    )


def parse_content(description: str, source: str) -> list[dict[str, Any]]:
    """Zachowuje kolejność tekstu i tabel, odrzucając tylko wiersze separatorów."""
    lines = description.splitlines()
    blocks: list[dict[str, Any]] = []
    text_lines: list[str] = []

    def flush_text() -> None:
        text = "\n".join(text_lines).strip()
        if text:
            blocks.append({"type": "text", "en": text, "pl": ""})
        text_lines.clear()

    index = 0
    while index < len(lines):
        if (
            "|" in lines[index]
            and index + 1 < len(lines)
            and is_table_separator(lines[index + 1])
        ):
            flush_text()
            headers = split_table_row(lines[index])
            if len(split_table_row(lines[index + 1])) != len(headers):
                raise ValueError(f"{source}: niezgodna liczba kolumn nagłówka tabeli.")

            rows = []
            index += 2
            while index < len(lines) and "|" in lines[index]:
                cells = split_table_row(lines[index])
                if len(cells) != len(headers):
                    raise ValueError(
                        f"{source}: tabela ma {len(headers)} kolumn, "
                        f"ale wiersz ma ich {len(cells)}: {lines[index]!r}."
                    )
                rows.append({"en": cells, "pl": []})
                index += 1

            blocks.append({
                "type": "table",
                "headers": {"en": headers, "pl": []},
                "rows": rows,
            })
        else:
            text_lines.append(lines[index])
            index += 1

    flush_text()
    return blocks


def parse_file(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8-sig")
    entries: list[dict[str, Any]] = []

    for match in ENTRY_PATTERN.finditer(text):
        name = match.group("name").strip()
        body = match.group("body")
        source = f"{path.name} / {name}"

        description_match = DESCRIPTION_PATTERN.search(body)
        if not description_match:
            raise ValueError(f"{source}: brak sekcji \"Pełny opis\".")

        category = parse_category(
            read_field(body, "Kategoria", source),
            source,
        )
        rank = parse_rating(
            read_field(body, "Poziom/ranga", source),
        )
        gnosis = parse_rating(
            read_field(body, "Gnoza", source),
        )
        description = description_match.group("description").strip()

        if not description:
            raise ValueError(f"{source}: opis jest pusty.")

        entries.append(
            {
                "type": category,
                "name": name,
                "rank": rank,
                "gnosis": gnosis,
                "description": description,
            }
        )

    headings = len(re.findall(r"^###[ \t]+", text, re.MULTILINE))
    if headings != len(entries):
        raise ValueError(
            f"{path.name}: znaleziono {headings} nagłówków, "
            f"ale odczytano {len(entries)} wpisów."
        )

    if not entries:
        raise ValueError(f"{path.name}: nie znaleziono żadnych wpisów.")

    return entries


def item_key(item_type: str, english_name: str) -> tuple[str, str]:
    return item_type.casefold(), english_name.casefold()


def load_existing_items(path: Path) -> dict[tuple[str, str], dict[str, Any]]:
    if not path.exists():
        return {}

    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(data, list):
        raise ValueError(f"{path}: główny element JSON musi być tablicą.")

    result: dict[tuple[str, str], dict[str, Any]] = {}

    for item in data:
        try:
            key = item_key(item["type"], item["names"]["en"])
        except (KeyError, TypeError) as error:
            raise ValueError(
                f"{path}: istniejący wpis nie ma poprawnego typu lub nazwy."
            ) from error

        if key in result:
            raise ValueError(
                f"{path}: powtórzona nazwa przedmiotu: "
                f"{item['names']['en']!r}."
            )

        result[key] = item

    return result


def find_existing_version(
    item: dict[str, Any] | None,
    book: str,
    edition: str | None,
    allow_unmarked_edition: bool = False,
) -> dict[str, Any] | None:
    if not item:
        return None

    matches = []
    same_book = []
    for version in item.get("versions", []):
        old_book, old_edition = source_from_name(version.get("book", ""))
        old_edition = version.get("edition") or old_edition
        if old_book.casefold() != book.casefold():
            continue
        same_book.append(version)
        if str(old_edition or "").casefold() != str(edition or "").casefold():
            continue
        matches.append(version)

    # Zachowaj ręcznie wpisaną edycję, jeśli nazwa jedynego pliku jej nie określa.
    if not matches and not edition and allow_unmarked_edition and len(same_book) == 1:
        matches = same_book

    if len(matches) > 1:
        raise ValueError(
            f"Przedmiot {item['names']['en']!r} ma kilka wersji "
            f"dla podręcznika {book!r} i edycji {edition!r}."
        )

    return matches[0] if matches else None


def english_block_key(block: dict[str, Any]) -> tuple:
    if block["type"] == "text":
        return "text", block.get("en", "").strip()
    if block["type"] == "table":
        return (
            "table",
            tuple(block["headers"].get("en", [])),
            tuple(tuple(row.get("en", [])) for row in block["rows"]),
        )
    raise ValueError(f"Nieobsługiwany typ bloku: {block['type']!r}.")


def has_polish_content(block: dict[str, Any]) -> bool:
    if block["type"] == "text":
        return bool(str(block.get("pl", "") or "").strip())
    return any(
        str(cell).strip()
        for cells in [block["headers"].get("pl", [])]
        + [row.get("pl", []) for row in block["rows"]]
        for cell in cells
    )


def preserve_content_translations(
    content: list[dict[str, Any]],
    version: dict[str, Any] | None,
    source: str,
) -> list[dict[str, Any]]:
    if not version:
        return content

    previous = defaultdict(deque)
    for block in version.get("content", []):
        previous[english_block_key(block)].append(block)

    for block in content:
        matches = previous[english_block_key(block)]
        if not matches:
            continue
        old_block = matches.popleft()
        if block["type"] == "text":
            block["pl"] = deepcopy(old_block.get("pl", ""))
        else:
            block["headers"]["pl"] = deepcopy(
                old_block["headers"].get("pl", [])
            )
            for row, old_row in zip(block["rows"], old_block["rows"]):
                row["pl"] = deepcopy(old_row.get("pl", []))

    if any(
        has_polish_content(block)
        for blocks in previous.values()
        for block in blocks
    ):
        raise ValueError(
            f"{source}: zmieniła się treść lub układ przetłumaczonego opisu. "
            "Uzgodnij polskie tłumaczenie przed ponownym importem."
        )

    return content


def build_items(
    input_files: list[Path],
    existing_items: dict[tuple[str, str], dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    items: list[dict[str, Any]] = []
    generated: dict[tuple[str, str], dict[str, Any]] = {}
    version_count = 0

    sources = [(path, *source_from_name(path.stem)) for path in input_files]
    source_counts = Counter(book.casefold() for _, book, _ in sources)

    for path, book, edition in sources:

        for entry in parse_file(path):
            key = item_key(entry["type"], entry["name"])
            existing_item = existing_items.get(key)
            item = generated.get(key)

            if item is None:
                polish_name = ""
                requirement = None

                if existing_item:
                    polish_name = str(
                        existing_item.get("names", {}).get("pl", "")
                    )
                    requirement = deepcopy(existing_item.get("requirement"))

                item = {
                    "type": entry["type"],
                    "names": {
                        "en": entry["name"],
                        "pl": polish_name,
                    },
                    "requirement": requirement,
                    "versions": [],
                }
                generated[key] = item
                items.append(item)

            old_version = find_existing_version(
                existing_item,
                book,
                edition,
                allow_unmarked_edition=source_counts[book.casefold()] == 1,
            )
            source = f"{path.name} / {entry['name']}"
            version: dict[str, Any] = {
                "book": book,
                "rank": entry["rank"],
                "gnosis": entry["gnosis"],
                "content": preserve_content_translations(
                    parse_content(entry["description"], source),
                    old_version,
                    source,
                ),
            }

            version_edition = edition or (
                old_version.get("edition") if old_version else None
            )
            if version_edition:
                version["edition"] = version_edition

            if any(
                existing_version["book"].casefold() == book.casefold()
                and str(existing_version.get("edition", "")).casefold()
                == str(version.get("edition", "")).casefold()
                for existing_version in item["versions"]
            ):
                raise ValueError(
                    f"Powtórzony wpis {entry['name']!r} "
                    f"w podręczniku {book!r}, edycja: {version_edition!r}."
                )

            item["versions"].append(version)
            version_count += 1

    return items, version_count


def save_json(path: Path, data: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8", newline="\r\n") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")


def main() -> None:
    arguments = parse_arguments()
    input_directory = arguments.input_dir.resolve()
    output = arguments.output.resolve()

    input_files = sorted(
        path
        for path in input_directory.glob("*.txt")
        if path.is_file()
    )

    if not input_files:
        raise RuntimeError(
            f"Nie znaleziono plików .txt w {input_directory}."
        )

    existing_items = load_existing_items(output)
    items, version_count = build_items(input_files, existing_items)
    if not arguments.check:
        save_json(output, items)

    print(f"Przetworzono plików: {len(input_files)}")
    print(f"Przedmiotów: {len(items)}")
    print(f"Wersji: {version_count}")
    if arguments.check:
        print("Kontrola zakończona poprawnie. Nie zapisano pliku wynikowego.")
    else:
        print(f"Plik wynikowy: {output}")


if __name__ == "__main__":
    main()
