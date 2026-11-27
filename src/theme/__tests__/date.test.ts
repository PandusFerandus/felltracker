import { describe, expect, it } from '@jest/globals';

import { monthYearLabel } from '../date';

describe('monthYearLabel', () => {
  it('zeigt den Monat auf Deutsch mit Jahr', () => {
    expect(monthYearLabel(new Date(2026, 10, 27))).toBe('November 2026');
    expect(monthYearLabel(new Date(2027, 2, 1))).toBe('März 2027');
  });
});
