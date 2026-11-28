/** Übersetzt Fehlermeldungen der Anmeldung in verständliches Deutsch. */
export function authMessage(error: unknown): string {
  const e = error as { message?: string; code?: string; status?: number } | null;
  const text = `${e?.code ?? ''} ${e?.message ?? ''}`.toLowerCase();
  if (text.includes('invalid login credentials') || text.includes('invalid_credentials')) return 'E-Mail oder Passwort stimmt nicht.';
  if (text.includes('already registered') || text.includes('user_already_exists') || text.includes('email_exists'))
    return 'Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte melde dich an.';
  if (text.includes('otp') && (text.includes('expired') || text.includes('invalid')))
    return 'Der Code stimmt nicht oder ist abgelaufen. Lass dir einen neuen schicken.';
  if (text.includes('token has expired') || text.includes('token is invalid'))
    return 'Der Code stimmt nicht oder ist abgelaufen. Lass dir einen neuen schicken.';
  if (text.includes('weak') || text.includes('password should')) return 'Das Passwort ist zu schwach. Bitte nimm mindestens 8 Zeichen.';
  if (text.includes('same_password') || text.includes('different from the old')) return 'Bitte wähle ein anderes Passwort als bisher.';
  if (text.includes('rate limit') || text.includes('over_email_send_rate') || e?.status === 429)
    return 'Zu viele Versuche oder E-Mails. Bitte warte ein paar Minuten.';
  if (text.includes('email address') && text.includes('invalid')) return 'Bitte prüfe die E-Mail-Adresse.';
  if (text.includes('signups not allowed')) return 'Neue Konten sind gerade nicht möglich.';
  if (text.includes('fetch') || text.includes('network') || text.includes('failed to') || text.includes('load failed'))
    return 'Keine Verbindung zum Server. Bitte prüfe dein Internet und versuch es noch einmal.';
  return 'Das hat nicht geklappt. Bitte versuch es noch einmal.';
}

export const isEmailNotConfirmed = (error: unknown) => {
  const e = error as { message?: string; code?: string } | null;
  return `${e?.code ?? ''} ${e?.message ?? ''}`.toLowerCase().includes('not confirmed');
};

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
