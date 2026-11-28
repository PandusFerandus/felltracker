// Verbindung zum Supabase-Projekt.
// Beides ist öffentlich gedacht (steckt in jeder App) und KEIN Geheimnis.
// Den geheimen Schlüssel (secret / service_role) und das Datenbank-Passwort niemals hier eintragen.
export const SUPABASE_URL: string = 'https://ojfmcvqtbjjuhxxkunjt.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY: string = 'sb_publishable_HkCnni7cV3VyovR29Tg7wA_fT2VE3UF';

export const accountsEnabled = SUPABASE_URL !== '' && SUPABASE_PUBLISHABLE_KEY !== '';
