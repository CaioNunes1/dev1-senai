import { ListablePlayer, PlayerSortOption, selectPlayers } from './player-listing';

const player = (
  id: number,
  name: string,
  age: number,
  position: ListablePlayer['position'],
  marketValue: number,
): ListablePlayer => ({ id, name, age, position, marketValue });

/** Elenco de exemplo; valores em centavos. Nos empates, a ordem dos ids contraria a dos nomes. */
const PLAYERS: readonly ListablePlayer[] = [
  player(2, 'João Silva', 25, 'MEI', 3000),
  player(1, 'Meia Lua', 25, 'MEI', 4000),
  player(3, 'Ana Lima', 19, 'ATA', 1100),
  player(4, 'Ana-Maria Souza', 33, 'GOL', 4140),
  player(5, 'Épsilon Rocha', 28, 'ZAG', 10000),
  player(7, 'Delta Costa', 30, 'LAT', 1200),
  player(6, 'Gama Reis', 22, 'ZAG', 1200),
];

const names = (sort: PlayerSortOption[], extra: object = {}) =>
  selectPlayers(PLAYERS, { sort, ...extra }).map((selected) => selected.name);

describe('selectPlayers (RN07)', () => {
  it('ordena pelo nome com a regra do enunciado (espaço antes do hífen; Épsilon entre Delta e Gama)', () => {
    expect(names(['name'])).toEqual([
      'Ana Lima',
      'Ana-Maria Souza',
      'Delta Costa',
      'Épsilon Rocha',
      'Gama Reis',
      'João Silva',
      'Meia Lua',
    ]);
  });

  it('ordena pelo valor de mercado, com empate desfeito pelo nome', () => {
    expect(names(['value_asc'])).toEqual([
      'Ana Lima',
      'Delta Costa',
      'Gama Reis',
      'João Silva',
      'Meia Lua',
      'Ana-Maria Souza',
      'Épsilon Rocha',
    ]);
    expect(names(['value_desc'])).toEqual([
      'Épsilon Rocha',
      'Ana-Maria Souza',
      'Meia Lua',
      'João Silva',
      'Delta Costa',
      'Gama Reis',
      'Ana Lima',
    ]);
  });

  it('ordena pela idade, com empate desfeito pelo nome', () => {
    expect(names(['age_asc'])).toEqual([
      'Ana Lima',
      'Gama Reis',
      'João Silva',
      'Meia Lua',
      'Épsilon Rocha',
      'Delta Costa',
      'Ana-Maria Souza',
    ]);
    expect(names(['age_desc'])[0]).toBe('Ana-Maria Souza');
  });

  it('ordena pela posição na ordem GOL, ZAG, LAT, MEI, ATA (não alfabética)', () => {
    expect(names(['position'])).toEqual([
      'Ana-Maria Souza',
      'Épsilon Rocha',
      'Gama Reis',
      'Delta Costa',
      'João Silva',
      'Meia Lua',
      'Ana Lima',
    ]);
  });

  it('com dois critérios, o segundo desempata o primeiro', () => {
    expect(names(['position', 'value_asc'])).toEqual([
      'Ana-Maria Souza',
      'Gama Reis',
      'Épsilon Rocha',
      'Delta Costa',
      'João Silva',
      'Meia Lua',
      'Ana Lima',
    ]);
  });

  it('desempata pelo id quando o nome também empata', () => {
    const twins = [
      player(9, 'Águias Lima', 20, 'MEI', 100),
      player(8, 'Aguias Lima', 20, 'MEI', 100),
    ];
    expect(selectPlayers(twins, { sort: ['name'] }).map((selected) => selected.id)).toEqual([8, 9]);
  });

  it.each([
    ['joao', ['João Silva']],
    ['LUA', ['Meia Lua']],
    ['ana', ['Ana Lima', 'Ana-Maria Souza']],
    ['xyz', []],
  ])('busca "%s" dentro do nome, sem diferenciar maiúsculas e acentos', (search, expected) => {
    expect(names(['name'], { search })).toEqual(expected);
  });

  it('filtra pela faixa de valor de mercado, inclusiva', () => {
    expect(names(['name'], { minValue: 1200, maxValue: 4000 })).toEqual([
      'Delta Costa',
      'Gama Reis',
      'João Silva',
      'Meia Lua',
    ]);
  });

  it('não altera a lista recebida', () => {
    const original = PLAYERS.map((selected) => selected.id);
    selectPlayers(PLAYERS, { sort: ['value_desc'] });
    expect(PLAYERS.map((selected) => selected.id)).toEqual(original);
  });
});
