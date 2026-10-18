import { describe, expect, it } from 'vitest';
import { breadcrumbFor } from './navigation';

const clubNames = new Map([[1, 'Águias FC']]);

describe('breadcrumbFor', () => {
  it.each([
    ['/players', ['Mercado', 'Jogadores']],
    ['/clubs', ['Mercado', 'Clubes']],
    ['/matches', ['Liga', 'Partidas']],
    ['/standings', ['Liga', 'Classificação']],
  ])('%s → %j', (pathname, labels) => {
    expect(breadcrumbFor(pathname, clubNames).map(({ label }) => label)).toEqual(labels);
  });

  it('mostra o nome do clube e liga de volta para a lista', () => {
    expect(breadcrumbFor('/clubs/1', clubNames)).toEqual([
      { label: 'Mercado' },
      { label: 'Clubes', to: '/clubs' },
      { label: 'Águias FC' },
    ]);
  });

  it('usa "Clube {id}" quando o clube não está na lista', () => {
    expect(breadcrumbFor('/clubs/99', clubNames).at(-1)).toEqual({ label: 'Clube 99' });
  });
});
