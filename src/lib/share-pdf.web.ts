/**
 * Im Browser gibt es kein Teilen-Menü für Dateien. Stattdessen öffnet sich der
 * Druckdialog; dort kann man drucken oder "Als PDF speichern" wählen.
 */
export async function sharePdf(html: string, _title: string): Promise<void> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
  const win = frame.contentWindow;
  if (!win) throw new Error('Druckansicht fehlt');
  win.focus();
  win.print();
  setTimeout(() => frame.remove(), 60_000);
}

export const SHARE_PDF_LABEL = 'Drucken oder als PDF speichern';
