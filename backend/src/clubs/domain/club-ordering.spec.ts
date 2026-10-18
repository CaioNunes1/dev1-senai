import { sortClubs } from './club-ordering';

/** Nos empates, a ordem dos ids contraria a dos nomes, para verificar o desempate pelo nome. */
const CLUBS = [
  { id: 1, name: 'Gama SC', netWorth: 30000 },
  { id: 2, name: 'Épsilon EC', netWorth: 29815 },
  { id: 3, name: 'Delta FC', netWorth: 30000 },
  { id: 4, name: 'Águias FC', netWorth: 31000 },
  { id: 5, name: 'Aguias FC', netWorth: 31000 },
];

const names = (sort: Parameters<typeof sortClubs>[1]) =>
  sortClubs(CLUBS, sort).map((club) => `${club.name}#${club.id}`);

describe('sortClubs (RN11)', () => {
  it('ordena pelo nome sem acentos; nomes iguais desempatam pelo id', () => {
    expect(names('name')).toEqual([
      'Águias FC#4',
      'Aguias FC#5',
      'Delta FC#3',
      'Épsilon EC#2',
      'Gama SC#1',
    ]);
  });

  it('ordena pelo patrimônio, do maior para o menor, com desempate pelo nome', () => {
    expect(names('net_worth_desc')).toEqual([
      'Águias FC#4',
      'Aguias FC#5',
      'Delta FC#3',
      'Gama SC#1',
      'Épsilon EC#2',
    ]);
  });

  it('ordena pelo patrimônio, do menor para o maior, com desempate pelo nome', () => {
    expect(names('net_worth_asc')).toEqual([
      'Épsilon EC#2',
      'Delta FC#3',
      'Gama SC#1',
      'Águias FC#4',
      'Aguias FC#5',
    ]);
  });
});
