import type { CategoryId, SelectedItem, Species } from '../types';
import { dogCatalog, type Category } from './dog';

export type { Category } from './dog';

/** Punktekatalog je Tierart. Weitere Tierarten kommen später hier dazu. */
const catalogs: Record<Species, Category[]> = {
  dog: dogCatalog,
};

export function catalogFor(species: Species): Category[] {
  return catalogs[species];
}

/** Kategorien, zu denen an einem Tag mindestens ein Punkt ausgewählt ist, in Katalog-Reihenfolge. */
export function categoriesOf(species: Species, items: SelectedItem[]): Category[] {
  const used = new Set<CategoryId>(items.map((i) => i.category));
  return catalogFor(species).filter((c) => used.has(c.id));
}

/** Textzeilen wie "Haut & Ohren: Juckreiz, Pfoten lecken", gruppiert nach Kategorie. */
export function itemLines(species: Species, items: SelectedItem[]): string[] {
  return catalogFor(species)
    .map((c) => ({ c, labels: items.filter((i) => i.category === c.id).map((i) => i.label) }))
    .filter((g) => g.labels.length > 0)
    .map((g) => `${g.c.short}: ${g.labels.join(', ')}`);
}
