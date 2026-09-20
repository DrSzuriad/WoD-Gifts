"""Konwertuje pliki tekstowe z katalogu Fetish do data/fetishes.json.

Uruchomienie z katalogu projektu:

    python work/Fetish/convert_to_json.py

Skrypt zachowuje istniejące polskie tłumaczenia i pole ``requirement`` podczas
ponownego generowania tego samego przedmiotu. Nowe przedmioty otrzymują
``requirement: null``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


SCRIPT_DIRECTORY = Path(__file__).resolve().parent
PROJECT_DIRECTORY = SCRIPT_DIRECTORY.parent.parent
DEFAULT_OUTPUT = PROJECT_DIRECTORY / "data" / "fetishes.json"

FILE_NAME_PREFIX = "WOD - Werewolf - The Apocalypse - "

ENTRY_PATTERN = re.compile(
    r"^###\s+(?P<name>[^\r\n]+?)\s*$\r?\n"
    r"(?P<body>.*?)(?=^###\s+|\Z)",
    re.MULTILINE | re.DOTALL,
)

DESCRIPTION_PATTERN = re.compile(
    r"^Pełny opis:\s*(?:\r?\n)+"
    r"(?P<description>.*?)"
    r"(?=^\s*---\s*$|^##\s+|\Z)",
    re.MULTILINE | re.DOTALL,
)

CATEGORY_MAP = {
    "fetysz": "Fetish",
    "fetish": "Fetish",
    "talen": "Talen",
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
            "Konwertuje wszystkie pliki .txt z katalogu Fetish "
            "do wspólnego pliku JSON."
        )
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=SCRIPT_DIRECTORY,
        help="Katalog z plikami .txt (domyślnie katalog skryptu).",
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
        rf"^{re.escape(label)}:\s*(.*?)\s*$",
        body,
        re.MULTILINE,
    )

    if not match:
        raise ValueError(f"{source}: brak pola \"{label}\".")

    return match.group(1).strip()


def parse_optional_number(value: str, field: str, source: str) -> int | None:
    if value.casefold() in MISSING_VALUES:
        return None

    if not value.isdigit():
        raise ValueError(
            f"{source}: pole \"{field}\" powinno zawierać liczbę "
            f"albo \"nie podano\", otrzymano: {value!r}."
        )

    return int(value)


def parse_category(value: str, source: str) -> str:
    category = CATEGORY_MAP.get(value.casefold())

    if category is None:
        allowed = ", ".join(sorted(set(CATEGORY_MAP.values())))
        raise ValueError(
            f"{source}: nieznana kategoria {value!r}. "
            f"Dozwolone kategorie: {allowed}."
        )

    return category


def book_name_from_file(path: Path) -> str:
    name = path.stem.strip()

    if name.casefold().startswith(FILE_NAME_PREFIX.casefold()):
        name = name[len(FILE_NAME_PREFIX) :].strip()

    if not name:
        raise ValueError(f"Nie można ustalić nazwy podręcznika z {path.name}.")

    return name


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
        level = parse_optional_number(
            read_field(body, "Poziom/ranga", source),
            "Poziom/ranga",
            source,
        )
        gnosis = parse_optional_number(
            read_field(body, "Gnoza", source),
            "Gnoza",
            source,
        )
        description = description_match.group("description").strip()

        if not description:
            raise ValueError(f"{source}: opis jest pusty.")

        entries.append(
            {
                "type": category,
                "name": name,
                "level": level,
                "gnosis": gnosis,
                "description": description,
            }
        )

    headings = len(re.findall(r"^###\s+", text, re.MULTILINE))
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
) -> dict[str, Any] | None:
    if not item:
        return None

    matches = [
        version
        for version in item.get("versions", [])
        if str(version.get("book", "")).casefold() == book.casefold()
    ]

    if len(matches) > 1:
        raise ValueError(
            f"Przedmiot {item['names']['en']!r} ma kilka wersji "
            f"dla podręcznika {book!r}."
        )

    return matches[0] if matches else None


def preserved_polish_content(version: dict[str, Any] | None) -> str:
    if not version:
        return ""

    content = version.get("content", [])
    if len(content) != 1 or content[0].get("type") != "text":
        return ""

    return str(content[0].get("pl", ""))


def build_items(
    input_files: list[Path],
    existing_items: dict[tuple[str, str], dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    items: list[dict[str, Any]] = []
    generated: dict[tuple[str, str], dict[str, Any]] = {}
    version_count = 0

    for path in input_files:
        book = book_name_from_file(path)

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

            if any(
                str(version.get("book", "")).casefold() == book.casefold()
                for version in item["versions"]
            ):
                raise ValueError(
                    f"Powtórzony wpis {entry['name']!r} "
                    f"w podręczniku {book!r}."
                )

            old_version = find_existing_version(existing_item, book)
            version: dict[str, Any] = {
                "book": book,
                "level": entry["level"],
                "gnosis": entry["gnosis"],
                "content": [
                    {
                        "type": "text",
                        "en": entry["description"],
                        "pl": preserved_polish_content(old_version),
                    }
                ],
            }

            if old_version and old_version.get("edition"):
                version["edition"] = old_version["edition"]

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
    save_json(output, items)

    print(f"Przetworzono plików: {len(input_files)}")
    print(f"Zapisano przedmiotów: {len(items)}")
    print(f"Zapisano wersji: {version_count}")
    print(f"Plik wynikowy: {output}")


if __name__ == "__main__":
    main()
