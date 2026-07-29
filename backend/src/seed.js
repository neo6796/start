// Počiatočný katalóg produktov. Spustí sa iba raz (kým meta.seeded !== true).
import { id } from './store.js';

export const SEED_PRODUCTS = [
  {
    id: id('p_'),
    name: 'Plnotučné mlieko 3,5 %',
    description: 'Čerstvé kravské, 1 l',
    unit: '1 l',
    category: 'Kravské',
    active: true,
  },
  {
    id: id('p_'),
    name: 'Polotučné mlieko 1,5 %',
    description: 'Trvanlivé, 1 l',
    unit: '1 l',
    category: 'Kravské',
    active: true,
  },
  {
    id: id('p_'),
    name: 'Bezlaktózové mlieko 1,5 %',
    description: 'Bez laktózy, 1 l',
    unit: '1 l',
    category: 'Bezlaktózové',
    active: true,
  },
  {
    id: id('p_'),
    name: 'Ovsené nápoj (barista)',
    description: 'Rastlinná alternatíva, 1 l',
    unit: '1 l',
    category: 'Rastlinné',
    active: true,
  },
  {
    id: id('p_'),
    name: 'Mandľový nápoj',
    description: 'Rastlinná alternatíva, 1 l',
    unit: '1 l',
    category: 'Rastlinné',
    active: true,
  },
];

export function seedIfNeeded(data, saveFn) {
  if (data.meta?.seeded) return data;
  data.products = SEED_PRODUCTS;
  data.meta = { ...(data.meta || {}), seeded: true };
  saveFn(data);
  return data;
}
