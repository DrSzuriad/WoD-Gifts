import json

INPUT_JSON = "gifts.json"

OUTPUT_EN = "translations_en.json"
OUTPUT_PL = "translations_pl.json"


def export_language(gifts, language):
    result = []

    for gift_index, gift in enumerate(gifts, start=1):

        exported = {
            "gift": gift_index,
            "name": "",
            "content": []
        }

        # ---------- NAME ----------

        if gift.get("requirements"):
            exported["name"] = (
                gift["requirements"][0]
                .get("names", {})
                .get(language, "")
            )

        # ---------- CONTENT ----------

        for version in gift.get("versions", []):

            for element in version.get("content", []):

                if element["type"] == "text":

                    exported["content"].append({
                        "type": "text",
                        "value": element.get(language, "")
                    })

                elif element["type"] == "table":

                    exported["content"].append({
                        "type": "table",
                        "headers": element["headers"].get(language, []),
                        "rows": [
                            row.get(language, [])
                            for row in element["rows"]
                        ]
                    })

        result.append(exported)

    return result


def save_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )


with open(INPUT_JSON, "r", encoding="utf-8") as f:
    gifts = json.load(f)

save_json(
    OUTPUT_EN,
    export_language(gifts, "en")
)

save_json(
    OUTPUT_PL,
    export_language(gifts, "pl")
)

print(f"Wyeksportowano {len(gifts)} darów.")
print(f"Utworzono:")
print(f"  {OUTPUT_EN}")
print(f"  {OUTPUT_PL}")