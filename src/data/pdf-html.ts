import { itemLines } from './catalog';
import { ageLabel, endOfMonth, formatGermanDate, fromDateKey } from './dates';
import { formatWeight } from './entry-logic';
import { monthName, monthOf, type MonthKey } from './month-logic';
import type { DateKey, DayEntry, Dog } from './types';

/** Schützt Texte, damit Eingaben wie "<" das PDF nicht kaputt machen. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const multiline = (text: string) => escapeHtml(text).replace(/\n/g, '<br>');

export function dogLine(dog: Dog, today: DateKey): string {
  return [dog.breed, ageLabel(dog.birthday, today)].filter(Boolean).join(' · ');
}

const shortDate = (key: DateKey) => {
  const d = fromDateKey(key);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
};

/** Zeitraum eines Monats, im laufenden Monat nur bis heute: "1.11.–27.11.2026" */
export function periodLabel(month: MonthKey, today: DateKey): string {
  const end = month === monthOf(today) ? today : endOfMonth(`${month}-01`);
  return `${shortDate(`${month}-01`)}–${shortDate(end)}${end.slice(0, 4)}`;
}

const BASE_CSS = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Nunito, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1C2E22; font-size: 11pt; margin: 0; }
  .brand { color: #2F6B45; font-weight: 800; font-size: 10pt; letter-spacing: .02em; }
  h1 { font-size: 22pt; margin: 4pt 0 2pt; }
  .muted { color: #4F6356; }
  .meta { margin: 2pt 0; }
`;

/** HTML für den Monatsexport: Tabelle mit Datum, Ereignissen/Symptomen, kg und Notiz. */
export function monthReportHtml(opts: { dog: Dog; month: MonthKey; entries: DayEntry[]; today: DateKey }): string {
  const { dog, month, entries, today } = opts;
  const rows = entries
    .map((e) => {
      const lines = itemLines(dog.species, e.items);
      return `<tr>
        <td class="date">${shortDate(e.date)}</td>
        <td>${lines.length ? lines.map((l) => `<div>${escapeHtml(l)}</div>`).join('') : '–'}</td>
        <td class="kg">${e.weightKg != null ? formatWeight(e.weightKg) : '–'}</td>
        <td>${e.note ? multiline(e.note) : '–'}</td>
      </tr>`;
    })
    .join('');
  const line = dogLine(dog, today);
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(`${dog.name} – ${monthName(month)}`)}</title>
<style>${BASE_CSS}
  table { width: 100%; border-collapse: collapse; margin-top: 12pt; font-size: 10pt; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th { text-align: left; background: #DAEBDC; padding: 6pt; font-weight: 800; }
  td { padding: 6pt; border-bottom: 1px solid #B5CCB9; vertical-align: top; overflow-wrap: anywhere; }
  .date { white-space: nowrap; width: 12%; }
  .kg { white-space: nowrap; width: 9%; }
  th.items { width: 45%; }
  .count { margin-top: 10pt; }
</style></head><body>
  <div class="brand">Felltracker · Monatsübersicht</div>
  <h1>${escapeHtml(dog.name)}</h1>
  ${line ? `<div class="meta muted">${escapeHtml(line)}</div>` : ''}
  <div class="meta muted">Zeitraum: ${periodLabel(month, today)} · erstellt am ${formatGermanDate(today)}</div>
  ${
    entries.length
      ? `<table><thead><tr><th>Datum</th><th class="items">Ereignisse und Symptome</th><th>kg</th><th>Notiz</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="count muted">${entries.length} ${entries.length === 1 ? 'Tag' : 'Tage'} mit Einträgen</div>`
      : '<p>Keine Einträge in diesem Zeitraum.</p>'
  }
</body></html>`;
}

export type ProfileFact = { label: string; value: string };

export function profileFacts(dog: Dog, today: DateKey): ProfileFact[] {
  const vet = [dog.vet.practice, dog.vet.address, dog.vet.phone ? `Tel. ${dog.vet.phone}` : ''].filter(Boolean).join('\n');
  return [
    { label: 'Geburtstag', value: formatGermanDate(dog.birthday) },
    { label: 'Alter', value: ageLabel(dog.birthday, today) },
    { label: 'Rasse', value: dog.breed },
    { label: 'Medikamente', value: dog.medication },
    { label: 'Futterart', value: dog.foodType },
    { label: 'Futtermenge', value: dog.foodAmount },
    { label: 'Haustierarzt', value: vet },
    { label: 'Wichtige weitere Infos', value: dog.info },
  ].map((f) => ({ ...f, value: f.value.trim() || '–' }));
}

/** HTML für das Hundeprofil als PDF. */
export function profileHtml(opts: { dog: Dog; today: DateKey }): string {
  const { dog, today } = opts;
  const photo = dog.photo.startsWith('data:image/') ? `<img class="photo" src="${escapeHtml(dog.photo)}" alt="">` : '';
  const facts = profileFacts(dog, today)
    .map((f) => `<div class="fact"><div class="label">${escapeHtml(f.label)}</div><div class="value">${multiline(f.value)}</div></div>`)
    .join('');
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(`${dog.name} – Hundeprofil`)}</title>
<style>${BASE_CSS}
  .photo { width: 120pt; height: 120pt; border-radius: 50%; object-fit: cover; margin-top: 10pt; border: 4pt solid #DAEBDC; }
  .fact { padding: 7pt 0; border-bottom: 1px solid #B5CCB9; break-inside: avoid; page-break-inside: avoid; }
  .label { color: #4F6356; font-size: 9.5pt; font-weight: 700; }
  .value { margin-top: 2pt; overflow-wrap: anywhere; }
</style></head><body>
  <div class="brand">Felltracker · Hundeprofil</div>
  ${photo}
  <h1>${escapeHtml(dog.name)}</h1>
  <div class="meta muted">erstellt am ${formatGermanDate(today)}</div>
  ${facts}
</body></html>`;
}
