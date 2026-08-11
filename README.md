# Garou Gifts

[Polski](#polski) | [English](#english)

## Polski

Dwujęzyczna przeglądarka Darów Garou do gry *Werewolf: The Apocalypse*. Strona pozwala filtrować Dary według rangi, rasy, auspicjum, plemienia i frakcji oraz przełączać ich treść między językiem angielskim i polskim.

Strona jest dostępna pod adresem:

https://drszuriad.github.io/WoD-Gifts/

## Funkcje

- filtrowanie Darów Garou według ich wymagań;
- obsługa wielu wybranych filtrów;
- sortowanie według rangi i nazwy;
- przełączanie języka angielskiego i polskiego;
- wybór wersji Daru pochodzącej z konkretnego podręcznika lub edycji;
- wyświetlanie opisów i tabel;
- automatyczne użycie tekstu angielskiego, gdy brakuje tłumaczenia;
- zapamiętywanie języka i filtrów w pamięci przeglądarki.

Zakładki dla Bastet, Corax i Mokole są obecnie przygotowane jako elementy przyszłego rozwoju strony.

## Uruchomienie lokalne

Projekt nie wymaga instalowania zależności ani procesu budowania. Ze względu na wczytywanie danych przez `fetch()` stronę należy uruchomić przez lokalny serwer HTTP, a nie bezpośrednio jako plik.

Przykład z użyciem Pythona:

```sh
python -m http.server 8000
```

Następnie otwórz w przeglądarce:

```text
http://localhost:8000/
```

Połączenie z internetem jest wymagane do pobrania biblioteki [Choices.js](https://choices-js.github.io/Choices/) z CDN.

## Struktura projektu

```text
.
├── index.html          interfejs strony
├── css/main.css        style
├── js/app.js           filtrowanie, rendering i ustawienia
├── data/gifts.json     dane Darów używane przez stronę
└── work/               robocze materiały i narzędzia tłumaczeniowe
```

Folder `work/` nie jest częścią aplikacji publikowanej dla użytkowników. Zawiera pliki pomocnicze wykorzystywane podczas pracy nad polskim tłumaczeniem.

## Publikacja

Strona jest aplikacją statyczną i może być publikowana bezpośrednio przez GitHub Pages z głównej gałęzi repozytorium. Nie wymaga Node.js, bundlera ani generowania plików wynikowych.

## Licencja i prawa do treści

Kod źródłowy strony jest udostępniony na licencji MIT — szczegóły znajdują się w pliku [LICENSE](LICENSE).

Licencja MIT nie obejmuje treści pochodzących z gry *Werewolf: The Apocalypse*, tłumaczeń tych treści, nazw własnych, znaków towarowych ani materiałów źródłowych. Prawa do tych elementów należą do ich odpowiednich właścicieli. Projekt jest nieoficjalnym przedsięwzięciem fanowskim i nie jest powiązany ani zatwierdzony przez właścicieli marki World of Darkness.

---

## English

A bilingual Garou Gifts browser for *Werewolf: The Apocalypse*. The website lets users filter Gifts by rank, breed, auspice, tribe, and faction, and switch their content between English and Polish.

The website is available at:

https://drszuriad.github.io/WoD-Gifts/

### Features

- filtering Garou Gifts by their requirements;
- support for multiple selected filters;
- sorting by rank and name;
- switching between English and Polish;
- selecting a Gift version from a specific sourcebook or edition;
- displaying descriptions and tables;
- automatically falling back to English when a translation is missing;
- saving the selected language and filters in browser storage.

The Bastet, Corax, and Mokole tabs are currently placeholders for future development.

### Running locally

The project requires no dependency installation or build process. Because its data is loaded using `fetch()`, the website must be served through a local HTTP server rather than opened directly as a file.

For example, using Python:

```sh
python -m http.server 8000
```

Then open the following address in a browser:

```text
http://localhost:8000/
```

An internet connection is required to load [Choices.js](https://choices-js.github.io/Choices/) from the CDN.

### Project structure

```text
.
├── index.html          website interface
├── css/main.css        styles
├── js/app.js           filtering, rendering, and settings
├── data/gifts.json     Gift data used by the website
└── work/               translation workspace and supporting tools
```

The `work/` directory is not part of the website delivered to users. It contains supporting files used while working on the Polish translation.

### Deployment

The website is a static application and can be published directly from the repository's main branch using GitHub Pages. It does not require Node.js, a bundler, or generated build artifacts.

### License and content rights

The website's source code is released under the MIT License. See [LICENSE](LICENSE) for details.

The MIT License does not cover content originating from *Werewolf: The Apocalypse*, translations of that content, proper names, trademarks, or source materials. The rights to those elements belong to their respective owners. This is an unofficial fan project and is not affiliated with or endorsed by the owners of the World of Darkness brand.
