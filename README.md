# Darts-Scorer (App)

Installierbare Web-App (PWA) zum Darts spielen, trainieren und auswerten:

- **Home**: Überblick mit Average, Spielen, Siegquote, Trainings, Schnellstart und letzten Einheiten
- **Spielen**: 301/501 gegen den Darts-Bot (5 Stärken, Double-In, Legs) und **X01 Mehrspieler** (mehrere Spieler an einem Gerät)
- **Training**: Treffen-Plan, Single, Doppel, Triple, Checkouts, Punkte (5 Schwierigkeitsstufen)
- **Stats**: Übersicht und Entwicklung, Trefferquote mit Trefferbild, Verlauf, **Daten** (Sicherung exportieren/importieren, alles löschen)
- **Zähler**: Felder abwerfen

Kein Server, keine Abhängigkeiten, keine Anmeldung. Alle Daten bleiben im Browser des Geräts (`localStorage`).

## Online

Die App läuft auf **https://xaver-17.github.io/darts-scorer/** und wird bei jedem Push auf `main` automatisch neu gebaut und veröffentlicht (`.github/workflows/pages.yml`).

## Schnell ausprobieren

`dist/index.html` per Doppelklick im Browser öffnen. Läuft komplett, nur ohne Offline-Modus und ohne Installation.

## Am Rechner entwickeln

```
python3 tools/build.py      # baut dist/ aus src/
python3 tools/serve.py      # http://localhost:8000 – baut bei jedem Neuladen neu
```

## Aufs Handy als App

Die App muss dafür einmal über **HTTPS** erreichbar sein. Einfachste Wege (kostenlos):

- **Netlify Drop**: https://app.netlify.com/drop öffnen und den Ordner `dist/` hineinziehen. Fertig, du bekommst eine Adresse.
- **GitHub Pages**: Inhalt von `dist/` in ein Repository legen, Pages aktivieren.

Dann auf dem iPhone die Adresse in **Safari** öffnen → Teilen → **Zum Home-Bildschirm**. Auf Android in Chrome: Menü → **App installieren**.
Danach startet die App ohne Browserleiste und funktioniert auch offline. Nach einem neuen Build einfach `dist/` erneut hochladen, die App holt sich die neue Version beim nächsten Start.

Wichtig: Die Daten liegen pro Gerät und pro Adresse. Über **Stats → Daten** kannst du sie sichern und auf einem anderen Gerät importieren.

## Tests

```
pip install playwright            # einmalig; nutzt das installierte Google Chrome
python3 tests/pwa_check.py        # Manifest, Service Worker, Offline-Start, Export/Import
python3 tests/e2e_walkthrough.py  # 2 Spiele gegen den Bot + alle Seiten, Screenshots in tests/out/
```

Wie der Code aufgebaut ist und wie du Neues einbaust: **[docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md)**.
