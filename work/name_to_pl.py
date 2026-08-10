"""Przepisuje wybrane polskie nazwy Darów do pliku translations_pl.json.

Domyślne użycie, gdy wszystkie trzy pliki są w tym samym katalogu:

    python przepisz_nazwy_darow.py

Skrypt odczytuje pole ``pl_selected`` z pliku
``nazwy_darow_propozycje.json`` i wpisuje je do pola ``name`` odpowiedniego
Daru w ``translations_pl.json``. Rekordy są łączone po polu ``gift``, a nie po
pozycji w tablicy. Zawartość pola ``content`` i wszystkie pozostałe dane pliku
polskiego pozostają bez zmian.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any


DEFAULT_NAMES = Path("nazwy_darow_propozycje.json")
DEFAULT_POLISH = Path("translations_pl.json")
DEFAULT_OUTPUT = Path("translations_pl_z_nazwami.json")


class DataError(ValueError):
    """Błąd struktury lub spójności danych wejściowych."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Przepisuje wartości pl_selected z pliku wyboru nazw do pól name "
            "w polskim pliku tłumaczeń."
        )
    )
    parser.add_argument(
        "--names",
        type=Path,
        default=DEFAULT_NAMES,
        help=f"plik z wybranymi nazwami (domyślnie: {DEFAULT_NAMES})",
    )
    parser.add_argument(
        "--polish",
        type=Path,
        default=DEFAULT_POLISH,
        help=f"polski plik JSON (domyślnie: {DEFAULT_POLISH})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help=f"plik wynikowy (domyślnie: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help=(
            "nadpisz plik podany przez --polish; przed zmianą zostanie utworzona "
            "kopia zapasowa .bak"
        ),
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="pozwól nadpisać istniejący plik wynikowy",
    )
    parser.add_argument(
        "--strict-choice",
        action="store_true",
        help=(
            "odrzuć pl_selected, jeśli nie jest jedną z pięciu propozycji "
            "(bez tej opcji własne nazwy są dozwolone)"
        ),
    )
    args = parser.parse_args()

    if args.in_place and args.output is not None:
        parser.error("nie można łączyć --in-place z --output")

    args.output = args.polish if args.in_place else (args.output or DEFAULT_OUTPUT)
    return args


def load_json(path: Path, label: str) -> Any:
    if not path.is_file():
        raise DataError(f"Nie znaleziono {label}: {path}")
    try:
        # utf-8-sig obsługuje także pliki zapisane z BOM-em.
        with path.open("r", encoding="utf-8-sig") as handle:
            return json.load(handle)
    except json.JSONDecodeError as exc:
        raise DataError(
            f"Niepoprawny JSON w pliku {path}: wiersz {exc.lineno}, "
            f"kolumna {exc.colno}: {exc.msg}"
        ) from exc
    except OSError as exc:
        raise DataError(f"Nie udało się odczytać pliku {path}: {exc}") from exc


def require_record_list(value: Any, label: str) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise DataError(f"{label} powinien zawierać tablicę JSON na najwyższym poziomie")
    if not all(isinstance(record, dict) for record in value):
        raise DataError(f"{label} zawiera element, który nie jest obiektem JSON")
    return value


def gift_id(record: dict[str, Any], label: str, position: int) -> int:
    value = record.get("gift")
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise DataError(
            f"Niepoprawne pole gift w {label}, element {position}: {value!r}"
        )
    return value


def index_by_gift(
    records: list[dict[str, Any]], label: str
) -> dict[int, dict[str, Any]]:
    result: dict[int, dict[str, Any]] = {}
    for position, record in enumerate(records, start=1):
        current_id = gift_id(record, label, position)
        if current_id in result:
            raise DataError(f"Powtórzony numer Daru {current_id} w {label}")
        result[current_id] = record
    return result


def nonempty_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None


def collect_selected_names(
    records: list[dict[str, Any]], strict_choice: bool
) -> tuple[dict[int, str], list[int], list[tuple[int, str]]]:
    selected: dict[int, str] = {}
    missing: list[int] = []
    custom: list[tuple[int, str]] = []

    for position, record in enumerate(records, start=1):
        current_id = gift_id(record, "pliku wyboru nazw", position)
        chosen = nonempty_text(record.get("pl_selected"))

        # Oficjalne wpisy powinny już mieć pl_selected, ale pl_official jest
        # bezpiecznym źródłem zapasowym dla niezmiennych nazw oficjalnych.
        if chosen is None and record.get("status") == "official":
            chosen = nonempty_text(record.get("pl_official"))

        if chosen is None:
            missing.append(current_id)
            continue

        proposals = record.get("pl_proposals", [])
        official = nonempty_text(record.get("pl_official"))
        allowed = {
            value.strip()
            for value in proposals
            if isinstance(value, str) and value.strip()
        }
        if official is not None:
            allowed.add(official)

        if chosen not in allowed:
            if strict_choice:
                raise DataError(
                    f"Dar {current_id}: pl_selected={chosen!r} nie występuje "
                    "w pl_proposals ani w pl_official"
                )
            custom.append((current_id, chosen))

        selected[current_id] = chosen

    return selected, missing, custom


def next_backup_path(path: Path) -> Path:
    first = path.with_name(path.name + ".bak")
    if not first.exists():
        return first
    counter = 1
    while True:
        candidate = path.with_name(f"{path.name}.bak.{counter}")
        if not candidate.exists():
            return candidate
        counter += 1


def write_json_atomic(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temporary_name = handle.name
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
        temporary_name = None
    finally:
        if temporary_name is not None:
            try:
                Path(temporary_name).unlink()
            except FileNotFoundError:
                pass


def format_id_list(values: list[int], limit: int = 30) -> str:
    shown = ", ".join(str(value) for value in values[:limit])
    if len(values) > limit:
        shown += f" … oraz {len(values) - limit} kolejnych"
    return shown


def main() -> int:
    args = parse_args()
    names_path = args.names.resolve()
    polish_path = args.polish.resolve()
    output_path = args.output.resolve()

    if names_path == polish_path:
        raise DataError("Plik wyboru nazw i polski plik tłumaczeń nie mogą być tym samym plikiem")
    if output_path == names_path:
        raise DataError("Plik wynikowy nie może nadpisać pliku wyboru nazw")
    if not args.in_place and output_path.exists() and not args.force:
        raise DataError(
            f"Plik wynikowy już istnieje: {output_path}\n"
            "Użyj --force, aby go nadpisać, albo wskaż inną ścieżkę przez --output."
        )

    name_records = require_record_list(
        load_json(names_path, "pliku wyboru nazw"), "Plik wyboru nazw"
    )
    polish_records = require_record_list(
        load_json(polish_path, "polskiego pliku tłumaczeń"),
        "Polski plik tłumaczeń",
    )

    names_by_id = index_by_gift(name_records, "pliku wyboru nazw")
    polish_by_id = index_by_gift(polish_records, "polskim pliku tłumaczeń")

    missing_in_polish = sorted(set(names_by_id) - set(polish_by_id))
    missing_in_names = sorted(set(polish_by_id) - set(names_by_id))
    if missing_in_polish or missing_in_names:
        details: list[str] = []
        if missing_in_polish:
            details.append(
                "brak w pliku polskim: " + format_id_list(missing_in_polish)
            )
        if missing_in_names:
            details.append(
                "brak w pliku wyboru nazw: " + format_id_list(missing_in_names)
            )
        raise DataError("Zestawy numerów Darów nie są zgodne; " + "; ".join(details))

    selected, missing, custom = collect_selected_names(
        name_records, args.strict_choice
    )
    if missing:
        raise DataError(
            f"Nie wybrano nazw dla {len(missing)} Darów (puste pl_selected): "
            + format_id_list(missing)
        )

    result = copy.deepcopy(polish_records)
    changed = 0
    unchanged = 0
    for position, record in enumerate(result, start=1):
        current_id = gift_id(record, "polskim pliku tłumaczeń", position)
        if "name" not in record:
            raise DataError(f"Dar {current_id} w polskim pliku nie ma pola name")
        old_name = record.get("name")
        new_name = selected[current_id]
        record["name"] = new_name
        if old_name == new_name:
            unchanged += 1
        else:
            changed += 1

    # Kontrola końcowa: poza polem name nic nie mogło się zmienić.
    for before, after in zip(polish_records, result, strict=True):
        before_without_name = {k: v for k, v in before.items() if k != "name"}
        after_without_name = {k: v for k, v in after.items() if k != "name"}
        if before_without_name != after_without_name:
            raise RuntimeError(
                f"Kontrola bezpieczeństwa wykryła zmianę danych Daru {before.get('gift')}"
            )

    backup_path: Path | None = None
    if args.in_place:
        backup_path = next_backup_path(polish_path)
        shutil.copy2(polish_path, backup_path)

    write_json_atomic(output_path, result)

    print(f"Gotowe: {output_path}")
    print(f"Liczba Darów: {len(result)}")
    print(f"Zmienione nazwy: {changed}")
    print(f"Nazwy już zgodne: {unchanged}")
    print(f"Własne nazwy spoza listy propozycji: {len(custom)}")
    if backup_path is not None:
        print(f"Kopia zapasowa: {backup_path}")
    if custom:
        print("Użyto własnych nazw dla Darów: " + format_id_list([gift for gift, _ in custom]))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except DataError as exc:
        print(f"Błąd: {exc}", file=sys.stderr)
        raise SystemExit(1)