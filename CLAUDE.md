# Felltagebuch – Bauanleitung

## 1. Worum es geht

Felltagebuch ("dein Hundetagebuch", früherer Arbeitsname: Felltracker) ist eine Tagebuch-App für Hunde, vom Prinzip ähnlich wie die Perioden-App Flo: Man tippt pro Tag an, was war, und sieht den Verlauf. Später soll die App auch für Katzen oder andere Tiere erweiterbar sein. Ziel: Apple App Store und Google Play. Die App bringt kein Geld ein, laufende Kosten sollen möglichst bei null liegen.

Vorlage ist `prototyp.dc.html` in diesem Repository. Es ist der klickbare Prototyp: Im Markup stehen Aufbau, Texte, Farben und Abstände, im Skript unten das Verhalten. Die Datei läuft nicht eigenständig, sie ist nur zum Lesen da. Beispieldaten (Bella, Milo, Kim, Alex), das feste Datum 27.11.2026 und alle "Vorschau:"-Meldungen gehören **nicht** in die echte App.

Wo diese Anleitung vom Prototyp abweicht, gilt die Anleitung.

## 2. So arbeitest du mit mir

- Ich kann **nicht programmieren**. Erkläre alles auf Deutsch, in einfachen Worten, mit "du".
- Arbeite in **größeren Paketen**: am besten eine ganze Etappe (siehe Abschnitt 8) auf einmal, mit einem Pull Request. Höre nach jedem Paket auf. Brauchst du vorher Entscheidungen oder Konten von mir, frage zuerst danach.
- Prüfe vor dem Abschluss selbst: Typprüfung (`npx tsc --noEmit`), Tests für die Datenlogik, Web-Build. Sage ehrlich, was du nicht prüfen konntest.
- Sage mir am Ende jedes Pakets: was fertig ist, was ich anklicken muss (z. B. Pull Request zusammenführen) und was ich ausprobieren soll.
- Frage vorher, wenn etwas Geld kostet, Daten löscht oder von dieser Anleitung abweicht.
- Keine Passwörter oder geheimen Schlüssel in den Code. Das Repository kann öffentlich sein.
- Das Repository heißt (noch) `felltracker`; interne Speichernamen (`felltracker:v1:…`) bleiben so, damit vorhandene Daten erhalten bleiben.

## 3. Technik

- Expo (React Native) mit TypeScript und Expo Router, aktuelle stabile Version. Prüfe die Versionen beim Anlegen, statt sie aus dem Gedächtnis zu wählen.
- Ein Code für iOS, Android und Web.
- **Web-Vorschau:** Bei jeder Änderung auf `main` baut eine GitHub Action die Web-Version und veröffentlicht sie über GitHub Pages (`baseUrl` passend zum Repository-Namen setzen). So kann ich auf jedem Handy im Browser testen.
- Nimm nur Bibliotheken, die auch im Web laufen, oder baue für Web einen einfachen Ersatz.
- Lokaler Speicher: AsyncStorage, hinter einer eigenen Speicher-Schicht, damit in Etappe 2 der Server dazukommen kann, ohne die Screens umzubauen.
- Profilbild: `expo-image-picker`, vor dem Speichern quadratisch zuschneiden und auf höchstens 512 px verkleinern.
- PDF: `expo-print` und `expo-sharing`.

## 4. Design

- Sprache: Deutsch. Grünes Design, **kein Rot**.
- Farben: Hintergrund `#F0F6EF`, Schrift `#1C2E22`, gedämpfte Schrift `#4F6356`, Hauptfarbe `#2F6B45`, helle Fläche `#DAEBDC`, Rahmen `#B5CCB9`, Karten weiß.
- Kategorienfarben: Ereignisse `#1F5C99`, Haut/Ohren `#B26B00`, Verdauung `#6A4590`, Gelenke `#B03A7A`.
- Schrift: Nunito (500, 700, 800). Runde Karten und Knöpfe.
- Tippflächen mindestens 44 px. Keine Emojis als Symbole. Beschriftungen für Bildschirmleser.
- Startseite ohne große Leerflächen: Knopf zum Eintragen unten Mitte, etwas vom Rand nach oben gesetzt.

## 5. Screens und Verhalten

### Anmelden (kommt erst in Etappe 2)
Anmelden, Registrieren, Passwort vergessen, darunter **"Ohne Konto starten"** mit Hinweis, dass die Daten dann nur auf diesem Handy bleiben. In Etappe 1 startet die App direkt ohne Konto. Gibt es noch keinen Hund, wird zuerst einer angelegt (Name genügt).

### Startseite
- Oben: Monat und Jahr, rechts Einstellungen.
- Kalenderleiste zum seitlichen Scrollen mit farbigen Punkten je Kategorie. Mindestens 12 Monate zurück und 6 Monate voraus; ältere Einträge bleiben erreichbar. Beim Öffnen steht heute in der Mitte.
- Rundes Profilbild (Tippen öffnet das Hundeprofil), Hundename mit Pfeil zum Hundewechsel, Rasse und Alter, bei geteilten Hunden "Gemeinsam mit …".
- Status und Einträge des gewählten Tages.
- Drei Kacheln: Kalender, Verlauf, Monatsexport.
- Hauptknopf: "Heutigen Tag eingeben" bzw. "bearbeiten"; für künftige Tage "Termin eintragen"; für vergangene Tage "<Datum> eingeben/bearbeiten".

### Tag eintragen
- Nur antippen, **keine Skala**.
- Ereignisse: Urlaub, Unfall, Deckakt, Läufigkeit, Impfung, Tierarztbesuch, Wurmkur, Floh-/Zeckenschutz, Hundefriseur, Gebadet, Hundesport, Physiotherapie, Futterwechsel
- Haut, Haar & Ohren: Pfoten lecken, Schütteln, Ohren kratzen, Haarausfall, Juckreiz, Rötung, Schuppen, Hotspot, Ohrgeruch, Fellgeruch
- Verdauung: Durchfall, Weicher Kot, Kein Haufen, Ungewöhnliche Farbe, Blut im Kot, Erbrechen, Blähungen, Appetitlos, Gras fressen
- Gelenke & Muskeln: Muskelzittern, Humpeln, Steifheit, Mühe beim Aufstehen, Meidet Treppen, Springt nicht, Schonhaltung, Schmerzlaute, Bewegungsunlust
- Je Kategorie eigene Einträge anlegen; sie bleiben dauerhaft zum Antippen. Gibt es den Namen schon (Groß-/Kleinschreibung egal), wird der vorhandene ausgewählt.
- Gewicht in kg: Komma oder Punkt, größer 0 und kleiner 120, eine Nachkommastelle.
- Freitext "Weitere Notizen".
- **Kein Foto-Upload** bei Tageseinträgen.
- Künftige Tage: nur Ereignisse und "Notiz zum Termin".
- Ein leer gespeicherter Eintrag wird gelöscht.

### Kalender
Monatsansicht (Montag zuerst) mit Punkten, Legende, Details zum gewählten Tag, Knopf zum Eintragen.

### Verlauf
Je Monat: Gewichtskurve mit Anfangs- und Endwert, darunter "An wie vielen Tagen?" als Balken, häufigstes zuerst. Nur Tage bis heute. Keine Bewertungen oder Diagnosen.

### Monatsexport
Je Monat eine Tabelle als PDF: Hundename, Rasse und Alter, Zeitraum, Erstellungsdatum; Spalten Datum, Ereignisse und Symptome, kg, Notiz. Nur Tage mit Einträgen bis heute. Lange Tabellen sauber auf mehrere Seiten umbrechen.

### Hundeprofil
- Profilbild über einen runden Foto-Knopf mit Auswahl "Foto aufnehmen", "Aus Mediathek wählen", "Foto entfernen", "Abbrechen". Kein Datei-Auswahlfeld sichtbar.
- Felder: Hundename, Geburtstag (Alter wird berechnet), Rasse, Medikamente, Futterart, Futtermenge, Haustierarzt (Praxis, Adresse, Telefon), Wichtige weitere Infos.
- "Als PDF teilen": Vorschau, dann ein Knopf "PDF teilen", der das Teilen-Menü des Handys öffnet (dort WhatsApp oder E-Mail wählen). Im Web: Drucken bzw. als PDF speichern.

### Einstellungen
Hundeprofil, Gemeinsam verwalten, Meine Hunde, Mein Konto.

### Meine Hunde
Hund wechseln (Kennzeichnung "dein Hund" / "mit dir geteilt"), neuen Hund hinzufügen.

### Gemeinsam verwalten
Ohne Konto: Hinweis "Dafür brauchst du ein Konto" mit "Konto erstellen" und "Später". Mit Konto: Personen sehen, per E-Mail einladen, entfernen. Nur die Besitzerperson lädt ein und entfernt.

### Mein Konto
Ohne Konto: Hinweis, dass die Daten nur auf dem Handy liegen, "Konto erstellen" und "Alle Daten löschen" mit Rückfrage. Mit Konto: Name, E-Mail, "Abmelden", "Konto löschen" mit Rückfrage.

In Etappe 1 zeigen "Konto erstellen" nur den Hinweis "Kommt bald".

## 6. Daten

- Hund: `id`, `species` (vorerst immer `dog`), Name, Geburtstag, Rasse, Medikamente, Futterart, Futtermenge, Haustierarzt, Infos, Profilbild.
- Tageseintrag: höchstens einer je Hund und Datum; ausgewählte Punkte als Liste aus Kategorie und Bezeichnung, Gewicht, Notiz, geändert am.
- Eigene Punkte: Kategorie und Bezeichnung, für alle eigenen Hunde nutzbar.
- Datum immer als lokales Datum `JJJJ-MM-TT` speichern (keine Zeitzonen-Verschiebung).
- Den Punktekatalog je Tierart getrennt ablegen, damit später Katzen dazukommen können. Jetzt **keine** Katzenfunktionen bauen.
- IDs als UUID, damit lokale Daten später ohne Konflikte auf den Server wandern.

## 7. Server (Etappe 2)

- Supabase, kostenloser Tarif, Region **Frankfurt**. Grenzen vorher aktuell prüfen und mir nennen (Speicher, Pausieren bei wenig Nutzung, Sicherungen, E-Mail-Versand für Bestätigung und Passwort).
- Anmeldung mit E-Mail und Passwort.
- Zugriffsregeln (Row Level Security) für jede Tabelle: Jede Person sieht nur eigene und mit ihr geteilte Hunde. Mit Tests belegen.
- Einladung: wird an die E-Mail-Adresse geknüpft und erscheint, sobald sich die Person damit anmeldet und annimmt.
- Beim Erstellen eines Kontos die lokalen eigenen Hunde samt Einträgen und eigenen Punkten übernehmen. Nichts lokal löschen, bevor die Übertragung bestätigt ist.
- Ohne Internet weiter eintragen können; bei Konflikten am selben Tag gewinnt die neuere Änderung, und das wird angezeigt.
- "Konto löschen" in der App löscht die Daten auch auf dem Server. Vorher mit mir klären, was mit geteilten Hunden passiert, wenn die Besitzerperson ihr Konto löscht.
- Gäste ohne Konto senden keine Daten an den Server.

**Entschieden (Etappe 2):**
- Löscht die Besitzerperson ihr Konto, geht ein geteilter Hund an die Person über, die am längsten mitverwaltet. Hunde ohne weitere Personen werden mit allen Einträgen gelöscht.
- E-Mails (Bestätigung, Passwort vergessen) laufen über einen eigenen kostenlosen SMTP-Dienst (Brevo). Die App nutzt einen Code aus der E-Mail statt eines Links. Einrichtung: `docs/SUPABASE-EINRICHTEN.md`.
- Mitverwaltende dürfen eintragen und das Hundeprofil ändern; nur die Besitzerperson lädt ein und entfernt.
- Meldet man sich mit einem bestehenden Konto an und es gibt Daten ohne Konto auf dem Gerät, fragt die App, ob sie übernommen werden sollen. Beim Erstellen eines Kontos werden sie automatisch übernommen.
- Datenbank-Schema und Zugriffsregeln: `supabase/migrations/`, Tests dazu: `supabase/tests/` (`npm run test:db`, braucht PostgreSQL).

## 8. Etappen

**Etappe 1 – App ohne Konto**
1. Projekt anlegen, Farben und Schrift, leere Startseite, Web-Vorschau über GitHub Pages.
2. Speicher-Schicht, Hund anlegen, Startseite mit Kalenderleiste.
3. Tag eintragen mit eigenen Punkten, Gewicht, Notiz.
4. Kalender und Verlauf.
5. Hundeprofil mit Profilbild, mehrere Hunde.
6. Monatsexport und Profil als PDF.

**Etappe 2 – Konten und gemeinsames Verwalten** (Abschnitt 7)

**Etappe 3 – Veröffentlichung**
App-Symbol, Startbild, Datenschutzerklärung, Impressum, Hinweis "ersetzt keinen Tierarzt", Konto-Löschung prüfen, Test auf echten Handys, Store-Einträge. Aktuelle Anforderungen von Apple und Google vorher nachlesen (Gebühren, Testpflicht für neue Google-Konten, Angaben zum Datenschutz). Vor der Veröffentlichung an die Markenprüfung für den Namen "Felltagebuch" erinnern.

**Nicht bauen:** Push-Benachrichtigungen, Werbung, Tracking oder Analyse-Dienste, Bezahlfunktionen.
