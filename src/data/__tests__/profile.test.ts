import { describe, expect, it } from '@jest/globals';

import { formatGermanDate, parseBirthday } from '../dates';
import { squareCrop } from '../photo-logic';

const today = '2026-11-27';

describe('Geburtstag', () => {
  it('liest deutsche Schreibweise', () => {
    expect(parseBirthday('14.03.2022', today)).toEqual({ ok: true, value: '2022-03-14' });
    expect(parseBirthday(' 4.3.2022 ', today)).toEqual({ ok: true, value: '2022-03-04' });
    expect(parseBirthday('', today)).toEqual({ ok: true, value: '' });
    expect(parseBirthday('27.11.2026', today)).toEqual({ ok: true, value: '2026-11-27' });
  });

  it('lehnt Falsches ab', () => {
    for (const bad of ['2022-03-14', '31.02.2022', '28.11.2026', '1.1.1970', '14.03.22', 'gestern']) {
      expect(parseBirthday(bad, today).ok).toBe(false);
    }
  });

  it('zeigt deutsche Schreibweise', () => {
    expect(formatGermanDate('2022-03-04')).toBe('04.03.2022');
    expect(formatGermanDate('')).toBe('');
  });
});

describe('Profilbild', () => {
  it('schneidet quer- und hochkant mittig quadratisch zu', () => {
    expect(squareCrop(4000, 3000)).toEqual({ crop: { originX: 500, originY: 0, width: 3000, height: 3000 }, size: 512 });
    expect(squareCrop(1080, 1920)).toEqual({ crop: { originX: 0, originY: 420, width: 1080, height: 1080 }, size: 512 });
  });

  it('vergrößert kleine Bilder nicht', () => {
    expect(squareCrop(300, 400).size).toBe(300);
  });
});
