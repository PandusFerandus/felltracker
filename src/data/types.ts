// Datenmodell der App (siehe CLAUDE.md, Abschnitt 6).

/** Lokales Datum im Format JJJJ-MM-TT, ohne Uhrzeit und Zeitzone. */
export type DateKey = string;

export type Species = 'dog';

export type CategoryId = 'events' | 'skin' | 'digestion' | 'joints';

export type Vet = {
  practice: string;
  address: string;
  phone: string;
};

export type Dog = {
  id: string;
  species: Species;
  name: string;
  /** Geburtstag als DateKey oder leer */
  birthday: DateKey | '';
  breed: string;
  medication: string;
  foodType: string;
  foodAmount: string;
  vet: Vet;
  info: string;
  /** Profilbild als Daten-URI oder Datei-Adresse, leer wenn keins */
  photo: string;
  createdAt: string;
  updatedAt: string;
  /** Konto der Besitzerperson; fehlt bei Hunden ohne Konto (nur auf diesem Gerät) */
  ownerId?: string | null;
  /** Namen der anderen Personen, die den Hund mitverwalten */
  sharedWith?: string[];
};

/** Ein angetippter Punkt eines Tages, z. B. { category: 'skin', label: 'Juckreiz' }. */
export type SelectedItem = {
  category: CategoryId;
  label: string;
};

export type DayEntry = {
  id: string;
  dogId: string;
  date: DateKey;
  items: SelectedItem[];
  /** Gewicht in kg mit höchstens einer Nachkommastelle, oder null */
  weightKg: number | null;
  note: string;
  updatedAt: string;
};

/** Selbst angelegter Punkt, für alle eigenen Hunde nutzbar. */
export type CustomItem = {
  id: string;
  species: Species;
  category: CategoryId;
  label: string;
  createdAt: string;
};

export type AppSettings = {
  activeDogId: string | null;
  /** 'guest' = ohne Konto, 'account' = mit Konto; fehlt, solange noch nichts gewählt wurde */
  mode?: 'guest' | 'account';
};
