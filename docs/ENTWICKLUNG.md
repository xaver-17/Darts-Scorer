# Entwickler-Anleitung

## Prinzip

Die App ist reines HTML/CSS/JavaScript ohne Framework und ohne npm. `tools/build.py` setzt alles aus `src/` zu **einer** Datei `dist/index.html` zusammen und legt daneben, was für die Installation als App nötig ist (`manifest.webmanifest`, `sw.js`, `icons/`).

```
src/
  counter.html        Grundgerüst der Seite + Zähler (eigenes Skript, localStorage 'zaehler3')
  core.js             Darts-Kern: Scheiben-Geometrie, Checkout-Wege 2–170, Bot-Würfe (global)
  js/                 die eigentliche App, in Module aufgeteilt (siehe unten)
  modules/            eigenständige Module mit eigenem globalem Objekt (z.B. x01.js + x01.css)
  trainer.css         Styles für Spiel, Training, Stats
  app.css             Design: Hintergrund, Glas-Karten, Kacheln, Navigation
  boardbg.txt         Dartscheiben-Hintergrund (data-URI, erzeugt von tools/gen_boardbg.py)
  pwa/                Manifest, Service Worker, Icons, Meta-Tags, PWA-CSS
tools/
  build.py            baut dist/
  serve.py            lokaler Server, baut bei jedem Neuladen neu
  gen_icons.py        App-Icons aus dem Logo erzeugen
  gen_boardbg.py      Hintergrund erzeugen
tests/
  pwa_check.py        PWA-Prüfung (Manifest, Service Worker, offline, Export/Import)
  e2e_walkthrough.py  Durchlauf: 2 Spiele gegen den Bot, alle Seiten
  stats_check.py      Wurf-Datenbank: Migration, Würfe aus allen Modi, Einzelpfeil-Training, Export/Import
dist/                 Build-Ergebnis – nicht von Hand ändern
```

## Die Module in `src/js/`

Alle Dateien werden **in Namensreihenfolge** aneinandergehängt und gemeinsam in eine Funktion gepackt. Sie teilen sich also alle Variablen und Funktionen, als wäre es eine Datei. Die Nummer am Anfang legt die Reihenfolge fest.

| Datei | Inhalt |
| --- | --- |
| `00-state.js` | Konstanten (Bot-Stärken, Trainingsmodi `TM`, Icons), der App-Zustand `T`, `save()`, Hilfsfunktionen, Erweiterungs-Register `EXT` |
| `05-drills.js` | hängt die Trainingsspiele aus `src/modules/drills.js` ein (Around the Clock, Bob's 27, Doppel-Runde, Checkout-Leiter): Einträge in `TM`, Helfer `ctx`, Aktionen `drHit`/`drBob`/`drDR`/`drLad` |
| `15-throws.js` | Wurf-Datenbank `TS` (IndexedDB: Sessions + einzelne Würfe), Übernahme alter Daten, Kennzahlen aus Würfen. Siehe [DATENMODELL.md](DATENMODELL.md) |
| `10-training.js` | Trainings-Aufgaben erzeugen, Sitzung starten/auswerten, Ergebnis in `T.hist` |
| `20-game.js` | Spiel gegen den Bot: Pfeile, Aufnahmen, Bot-Züge, Leg-/Spielende, Spieler-Statistik |
| `26-x01-hook.js` | hängt das Mehrspieler-X01 aus `src/modules/x01.js` ein |
| `30-board.js` | Dartscheibe als SVG, Tippen auf die Scheibe |
| `40-actions.js` | `act(a, v)`: **jeder** Klick auf ein Element mit `data-a="…"` landet hier |
| `50-views-home.js` | Einstellungsseiten (Spielen, Training) und Startseite |
| `60-views-stats.js` | Stats-Seite: Übersicht, Trefferquote, Verlauf |
| `65-stats-throws.js` | Stats aus der Wurf-Datenbank: Tab „Mehrspieler“, Doppelquote Spiel/Training, Trainingstrend und Stufen-Empfehlung |
| `70-views-session.js` | laufendes Training, laufendes Spiel, Zusammenfassung |
| `80-charts.js` | Kennzahl pro Eintrag (`metric`), Liniendiagramm (`chart`) |
| `85-data.js` | Stats → Daten: Sicherung exportieren/importieren, alles löschen |
| `90-main.js` | `render()`, Navigation, Start |

### So funktioniert eine Seite

1. Alles, was die App weiß, steht in `T` (wird nach jedem Rendern in `localStorage['dartsTrainer']` gespeichert).
2. `render()` baut je nach `T.route` (`home`, `play`, `train`, `stats`, `counter` …) HTML als Text und setzt es in `#viewTrainer`.
3. Buttons tragen `data-a` (Aktion) und optional `data-v` (Wert). Ein Klick ruft `act(a, v)` auf, ändert `T` und rendert neu.
4. Abgeschlossene Spiele und Trainings landen als Eintrag in `T.hist`. Daraus rechnen Startseite und Stats alles aus.

Hilfreich beim Bauen von HTML: `btn(aktion, beschriftung, wert, klasse, aktiv)` und `phead(titel, untertitel)`.

## Neues einbauen, ohne zentrale Dateien zu ändern

Neue Funktionen kommen am besten in **eine neue Datei** in `src/js/` und tragen sich in `EXT` ein:

```js
// src/js/27-cricket.js
  EXT.views.cricket = () => phead('Cricket', 'Zwei Spieler') + `<div class="card">…</div>` + btn('crHit', 'T20', 20);
  EXT.actions.crHit = (v, n) => { /* T ändern */ };      // Klick auf data-a="crHit"
  EXT.playLinks.push({ route: 'cricket', title: 'Cricket', sub: '2 Spieler' });   // Kachel unter "Spielen"
  // EXT.trainLinks.push(...)   Kachel unter "Training"
  // EXT.nav.push({ route, label, icon })   eigener Eintrag in der Navigation (Platz ist knapp)
  // EXT.dataKeys.push('dartsCricket')      eigener localStorage-Schlüssel, wird mit gesichert/gelöscht
  // EXT.after.cricket = container => {}    läuft nach jedem Rendern dieser Seite
```

Ein **eigenständiges Modul** mit eigener Klick-Logik und eigenem Speicher (wie `x01.js`) gehört nach `src/modules/` und bekommt einen eigenen Container neben `#viewTrainer`. Siehe `26-x01-hook.js`:

```js
  EXT.panels.x01 = { el: box, render: () => X01.render(), nav: 'play' };
```

`nav` sagt, welcher Navigationspunkt dabei hervorgehoben wird.

Wenn ein neuer Modus in den bestehenden Stats auftauchen soll, braucht er einen Eintrag in `TM` (`00-state.js`) und in `metric()` (`80-charts.js`).

## Gespeicherte Daten (`localStorage`)

| Schlüssel | Inhalt |
| --- | --- |
| `dartsTrainer` | Einstellungen, laufendes Training/Spiel, `hist` mit allen Ergebnissen inkl. Pfeil-Positionen, Navigation |
| `zaehler3` | Zähler |
| `dartsX01` | Mehrspieler-X01: Einstellungen, laufendes Spiel, eigene Spielhistorie |

Pfeil-Positionen in `hist[].dots`: `[x_mm, y_mm, Feld, Rest_davor, Checkout-Versuch 0/1, Ziel]`, Bull = (0,0), y nach oben, 20 oben.

Zusätzlich speichert die App jede Session mit allen einzelnen Würfen in **IndexedDB** (`darts-scorer`). Aufbau, Migration und Kennzahlen: **[DATENMODELL.md](DATENMODELL.md)**. Neue Spiel- oder Trainingsarten sollten ihre Würfe dort ablegen (`TS.put(session, würfe)`).

**Achtung bei Änderungen am Datenformat:** Nutzer haben alte Daten gespeichert. Neue Felder immer mit Standardwert lesen (`e.neu || 0`), nie alte Felder umbenennen, ohne die alten Einträge umzuwandeln.

## App-Version und Updates

`build.py` berechnet aus dem Inhalt eine Version (sichtbar unter Stats → Daten). Der Service Worker legt pro Version einen eigenen Cache an. Die Seite selbst wird immer zuerst aus dem Netz geladen, offline aus dem Cache. Nach dem Hochladen eines neuen Builds bekommt die installierte App die neue Version also beim nächsten Start mit Internet.

## Typische Abläufe

- **Etwas ändern:** Datei in `src/` bearbeiten → `python3 tools/serve.py` läuft → Browser neu laden.
- **Vor dem Hochladen:** `python3 tools/build.py`, dann beide Tests laufen lassen.
- **Logo ändern:** `LOGO` in `00-state.js` und in `tools/gen_icons.py` anpassen, `python3 tools/gen_icons.py`.

## Trainingsspiele (`src/modules/drills.js`)

Jedes Trainingsspiel ist ein Objekt in `window.DRILLS` (`atc`, `bob`, `dr`, `lad`) mit: `name`, `describe(stufe, anzahl, einstellungen)`, `opts()` (eigene Einstellungen statt „Aufgaben“), `start()` (neue Sitzung in `T.sess`), `view()`, `act()` (gibt `'finish'` zurück, wenn fertig), `entry()` (Eintrag für `T.hist`), `metric()`, `summary()`, `series` (Diagramm), `ov` (Kachel in der Übersicht, `low: true` = weniger ist besser), `tip()` und optional `extra()` (eigener Block in der Stats-Übersicht, z.B. Doppelquote pro Feld). Ein neues Trainingsspiel braucht nur ein weiteres Objekt dort und, falls es neue Knöpfe hat, den Aktionsnamen in `05-drills.js`.
