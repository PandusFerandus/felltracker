import type { CategoryId } from '../types';

export type Category = {
  id: CategoryId;
  /** Überschrift beim Eintragen */
  name: string;
  /** Kurzname für Legende und Startseite */
  short: string;
  color: string;
  items: string[];
};

/** Fester Punktekatalog für Hunde. */
export const dogCatalog: Category[] = [
  {
    id: 'events',
    name: 'Ereignisse',
    short: 'Ereignisse',
    color: '#1F5C99',
    items: [
      'Urlaub', 'Unfall', 'Deckakt', 'Läufigkeit', 'Impfung', 'Tierarztbesuch', 'Wurmkur',
      'Floh-/Zeckenschutz', 'Hundefriseur', 'Gebadet', 'Hundesport', 'Physiotherapie', 'Futterwechsel',
    ],
  },
  {
    id: 'skin',
    name: 'Haut, Haar & Ohren',
    short: 'Haut & Ohren',
    color: '#B26B00',
    items: [
      'Pfoten lecken', 'Schütteln', 'Ohren kratzen', 'Haarausfall', 'Juckreiz', 'Rötung', 'Schuppen',
      'Hotspot', 'Ohrgeruch', 'Fellgeruch',
    ],
  },
  {
    id: 'digestion',
    name: 'Verdauung',
    short: 'Verdauung',
    color: '#6A4590',
    items: [
      'Durchfall', 'Weicher Kot', 'Kein Haufen', 'Ungewöhnliche Farbe', 'Blut im Kot', 'Erbrechen',
      'Blähungen', 'Appetitlos', 'Gras fressen',
    ],
  },
  {
    id: 'joints',
    name: 'Gelenke & Muskeln',
    short: 'Gelenke & Muskeln',
    color: '#B03A7A',
    items: [
      'Muskelzittern', 'Humpeln', 'Steifheit', 'Mühe beim Aufstehen', 'Meidet Treppen', 'Springt nicht',
      'Schonhaltung', 'Schmerzlaute', 'Bewegungsunlust',
    ],
  },
];
