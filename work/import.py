import json

INPUT_GIFTS = "gifts.json"
INPUT_TRANSLATIONS = "translations_pl.json"
OUTPUT_GIFTS = "gifts_translated.json"


with open(INPUT_GIFTS, "r", encoding="utf-8") as f:
    gifts = json.load(f)

with open(INPUT_TRANSLATIONS, "r", encoding="utf-8") as f:
    translations = json.load(f)


if len(gifts) != len(translations):
    raise RuntimeError(
        f"Liczba Giftów nie zgadza się ({len(gifts)} != {len(translations)})"
    )


for gift, translation in zip(gifts, translations):

    # ------------------------
    # NAME
    # ------------------------

    if gift.get("requirements"):

        gift["requirements"][0]["names"]["pl"] = translation["name"]

    # ------------------------
    # CONTENT
    # ------------------------

    content_json = []

    for version in gift.get("versions", []):
        content_json.extend(version.get("content", []))

    content_translation = translation["content"]

    if len(content_json) != len(content_translation):
        raise RuntimeError(
            f"Gift {translation['gift']}: "
            f"liczba elementów content nie zgadza się "
            f"({len(content_json)} != {len(content_translation)})"
        )

    for json_element, tr_element in zip(content_json, content_translation):

        if json_element["type"] != tr_element["type"]:
            raise RuntimeError(
                f"Gift {translation['gift']}: "
                f"oczekiwano {json_element['type']}, "
                f"otrzymano {tr_element['type']}"
            )

        # ------------------------
        # TEXT
        # ------------------------

        if json_element["type"] == "text":

            json_element["pl"] = tr_element["value"]

        # ------------------------
        # TABLE
        # ------------------------

        elif json_element["type"] == "table":

            if len(json_element["headers"]["en"]) != len(tr_element["headers"]):
                raise RuntimeError(
                    f"Gift {translation['gift']}: "
                    "niezgodna liczba nagłówków tabeli"
                )

            json_element["headers"]["pl"] = tr_element["headers"]

            if len(json_element["rows"]) != len(tr_element["rows"]):
                raise RuntimeError(
                    f"Gift {translation['gift']}: "
                    "niezgodna liczba wierszy tabeli"
                )

            for json_row, tr_row in zip(
                json_element["rows"],
                tr_element["rows"]
            ):

                if len(json_row["en"]) != len(tr_row):
                    raise RuntimeError(
                        f"Gift {translation['gift']}: "
                        "niezgodna liczba kolumn tabeli"
                    )

                json_row["pl"] = tr_row


with open(OUTPUT_GIFTS, "w", encoding="utf-8") as f:
    json.dump(
        gifts,
        f,
        ensure_ascii=False,
        indent=2
    )

print(f"Zapisano: {OUTPUT_GIFTS}")