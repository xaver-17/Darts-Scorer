# Statistik-Datenmodell

Jede abgeschlossene Session (Spiel oder Training) wird mit allen einzelnen Pfeilen gespeichert. Statistiken lassen sich daraus jederzeit neu berechnen. Code: `src/js/15-throws.js` (Speicher, Migration), `src/js/65-stats-throws.js` (Auswertungen).

## Speicher

- **IndexedDB** `darts-scorer`, Version 1, zwei Tabellen:
  - `sessions` (Schlüssel `id`, Index `startedAt`): eine Zeile pro Spiel oder Training
  - `throws` (Schlüssel `sid`): eine Zeile pro Session mit `list` = alle Würfe dieser Session
- Ohne IndexedDB (selten, z.B. manche private Fenster) landet dasselbe als JSON in `localStorage['dartsStatsDb']`.
- `T.hist`, `dartsX01` und `zaehler3` bleiben unverändert bestehen. Die Datenbank ist eine Ergänzung, keine Ablösung.
- Im Speicher hält `TS` alles als Kopie; Lesen ist synchron (`TS.sessions()`, `TS.session(id)`, `TS.throws(id)`), Schreiben läuft im Hintergrund (`TS.put(session, würfe)`, `TS.remove(id)`).

## Session

| Feld | Inhalt |
| --- | --- |
| `id` | `g_<Datum>` Spiel vs. Bot, `x_<Datum>` X01 Mehrspieler, `t_<Modus>_<Datum>` Training. Gleich wie `sid` im `T.hist`-Eintrag |
| `v` | Schema-Version (1) |
| `kind` | `game` oder `training` |
| `mode` | `x01bot`, `x01multi` oder der Trainingsmodus (`hit`, `double`, `score`, `atc` …) |
| `level` | Stufe bzw. Bot-Stärke (0–4) |
| `players` | `[{ name, me?, bot? }]`; Würfe verweisen per Index (`who`) darauf |
| `cfg` | Einstellungen: `start`, `din`, `out` (`double`/`single`), `legsTo`, `perDart` |
| `tasks`, `log` | Nur Training mit Aufgaben: geplante Aufgaben `{type, n, darts}` und Ergebnis je Aufgabe `{ok, done, darts, allowed}` |
| `visits` | Nur Training „Punkte“: Summe je Aufnahme |
| `startedAt`, `endedAt` | ISO-Zeit |
| `result` | Endstand (Spiel: `{winner, legs}`), beim Training der komplette `T.hist`-Eintrag |
| `totals` | Kennzahlen je Spieler (siehe unten), beim Speichern aus den Würfen berechnet |
| `legacy` | `true` = aus alten Daten übernommen, Würfe fehlen ganz oder teilweise |

## Wurf

Leere Felder werden weggelassen.

| Feld | Inhalt |
| --- | --- |
| `who` | Index in `players` (0 = erster Spieler; Spiel vs. Bot: 0 = Du, 1 = Bot) |
| `leg`, `visit`, `dart` | Leg-Nr., Aufnahme-Nr. im Leg (je Spieler), Pfeil 1–3 |
| `task` | Training: Index der Aufgabe in `tasks` |
| `n`, `m`, `pts` | Segment (0 = Miss, 25 = Bull), Faktor (0–3), Punkte |
| `x`, `y` | Position in mm, Bull = (0,0), y nach oben (nur wenn auf der Scheibe getippt) |
| `aim` | Ziel: Checkout-Weg, sonst T20; im Training das Aufgabenfeld |
| `rem` | Rest vor dem Pfeil (X01) |
| `dbl` | 1 = Rest war mit diesem Pfeil checkbar (Double-Out: Doppel/Bull, Single-Out: jedes Feld) |
| `hit` | Training mit Einzelpfeil-Eingabe: 1 Treffer, 0 daneben |
| `flag` | `bust` überworfen, `out` Checkout, `in` Double-In geschafft, `noin` noch nicht drin (zählt 0) |
| `t` | Zeitstempel (ms) |

## Kennzahlen (`totalsFrom`)

- **3-Dart-Average** = Punkte / Pfeile × 3. Überworfene Aufnahmen zählen 0 Punkte, ihre Pfeile zählen mit.
- **Checkout-Quote** = Pfeile mit `flag = out` / Pfeile mit `dbl = 1`.
- **100+, 140+, 180er**: Aufnahmen in diesen Bändern (ohne Überschneidung). **Höchstes Finish**: `rem` des ersten Pfeils einer Aufnahme mit Checkout.
- **Doppelquote je Feld** (Stats → Übersicht): Spiel = Pfeile mit `aim` auf das Doppel; Training = Einzelpfeile bzw. bei schneller Eingabe 1 Treffer / benötigte Darts je Aufgabe.
- **Trainingstrend**: Ø der letzten 5 gegen die 5 davor. **Stufen-Empfehlung**: 3 Einheiten nacheinander auf derselben Stufe ≥ 70 % → nächste Stufe, ≤ 30 % → Stufe darunter (`LEVEL_UP`/`LEVEL_DOWN` in `65-stats-throws.js`).

## Migration und Sicherung

- Bei jedem Start legt `syncLegacy()` für jeden `T.hist`- und `dartsX01`-Eintrag ohne Session eine an. Alte Bot-Spiele bekommen ihre Spieler-Pfeile aus `dots`, alles andere nur die Summen. Läuft auch nach dem Import einer alten Sicherung.
- Gelöschte Verlaufseinträge (×) entfernen auch ihre Session.
- Export (Stats → Daten) ist Format 2: zusätzlich `statsDb = { sessions, throws }`. Format-1-Sicherungen lassen sich weiter importieren.
