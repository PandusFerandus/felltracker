// Tests für die Datenbank-Regeln. Brauchen eine laufende PostgreSQL-Datenbank (DATABASE_URL).
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/supabase/tests/**/*.test.ts'],
};
