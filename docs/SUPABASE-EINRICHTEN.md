# Supabase und Brevo einrichten (einmalig)

Diese Schritte machst du **einmal**, am besten am Computer. Die Menünamen bei Supabase und Brevo können leicht anders heißen als hier beschrieben.

**Wichtig:** Den Supabase-Schlüssel „secret“/„service_role“, dein Datenbank-Passwort und den Brevo-SMTP-Schlüssel gibst du nur direkt bei Supabase bzw. Brevo ein – niemals in den Chat oder in den Code.

---

## Teil A – Datenbank anlegen

1. Öffne auf GitHub im Repository die Datei `supabase/migrations/20261128000000_etappe2.sql`.
2. Klicke oben rechts auf **„Raw“** (oder das Symbol „Copy raw file“) und kopiere den **ganzen** Text.
3. Öffne dein Supabase-Projekt → links **SQL Editor** → **New query**.
4. Füge den Text ein und klicke auf **Run**.
5. Unten sollte **„Success. No rows returned“** stehen. Bei einer Fehlermeldung: Bildschirmfoto machen und mir schicken.

Diese Datei darf nur **einmal** ausgeführt werden. Ein zweites Mal gibt eine Fehlermeldung („already exists“) – das ist dann harmlos.

## Teil B – Anmeldung einstellen

Links **Authentication**:

1. **Sign In / Providers → Email**: „Enable Email provider“ an, **„Confirm email“ an**. Speichern.
2. Gleiche Seite oder **Policies/Passwords**: **Minimum password length = 8**. Speichern.
3. **URL Configuration → Site URL**: `https://pandusferandus.github.io/felltracker/` eintragen. Speichern.

## Teil C – E-Mail-Vorlagen (mit Code statt Link)

Die App arbeitet mit einem **Code aus der E-Mail**. Dafür muss in den Vorlagen der Platzhalter `{{ .Token }}` stehen.

Links **Authentication → Emails → Templates**:

**„Confirm signup“**
- Betreff: `Dein Code für Felltagebuch`
- Inhalt (alles ersetzen):

```html
<h2>Willkommen bei Felltagebuch</h2>
<p>Dein Bestätigungscode lautet:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>Gib diesen Code in der App ein. Wenn du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.</p>
```

**„Reset Password“**
- Betreff: `Neues Passwort für Felltagebuch`
- Inhalt (alles ersetzen):

```html
<h2>Passwort zurücksetzen</h2>
<p>Dein Code lautet:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>Gib diesen Code in der App ein und lege dann ein neues Passwort fest. Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
```

Jeweils **Save** klicken.

## Teil D – E-Mails über Brevo verschicken

**In Brevo:**
1. Melde dich bei brevo.com an.
2. Oben rechts auf deinen Namen → **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**. Name `Felltagebuch`, deine E-Mail-Adresse. Brevo schickt dir einen Bestätigungslink – anklicken.
3. Oben rechts auf deinen Namen → **SMTP & API** → Reiter **SMTP**.
   - Notiere dir **SMTP Server** (meist `smtp-relay.brevo.com`), **Port** (`587`) und **Login** (sieht aus wie `…@smtp-brevo.com`).
   - Klicke **Generate a new SMTP key**, Name z. B. `Supabase`. Den Schlüssel kopieren (er wird nur einmal angezeigt).

**In Supabase** → **Authentication → Emails → SMTP Settings** → **Enable Custom SMTP**:
- Sender email: die in Brevo bestätigte Adresse
- Sender name: `Felltagebuch`
- Host: `smtp-relay.brevo.com`
- Port: `587`
- Username: der **Login** aus Brevo
- Password: der **SMTP-Schlüssel** aus Brevo

**Save** klicken.

Hinweis: E-Mails, die über Brevo im Namen einer Gmail-/Googlemail-Adresse verschickt werden, landen manchmal im Spam-Ordner. Zum Testen ist das in Ordnung; für die Veröffentlichung (Etappe 3) ist eine eigene Absender-Domain besser.

## Teil E – Ausprobieren

1. Web-Vorschau öffnen → **Mein Konto → Konto erstellen**.
2. Name, E-Mail, Passwort (mind. 8 Zeichen) → **Registrieren**.
3. Code aus der E-Mail eingeben (auch im Spam-Ordner schauen).
4. Danach sollten deine bisherigen Einträge im Konto sein. In Supabase unter **Table Editor → dogs** siehst du deinen Hund.

## Gut zu wissen

- **Pausiert:** Ohne Nutzung pausiert Supabase das kostenlose Projekt nach etwa einer Woche. Dann im Dashboard das Projekt öffnen und **Restore/Resume** klicken. Die App funktioniert in der Zeit weiter, gleicht aber nicht ab.
- **Keine automatischen Sicherungen** im kostenlosen Tarif.
