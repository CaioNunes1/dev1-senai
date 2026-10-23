import { Condition, Position } from '../../players/domain/player.types';
import { conditionedValue, playMatch, resultOf, Starter } from './match-engine';

/** Titular com todos os atributos em 50, exceto os informados. */
function starter(
  id: number,
  name: string,
  position: Position,
  overrides: Partial<Starter> = {},
  condition: Condition = 'APTO',
): Starter {
  return {
    id,
    name,
    position,
    condition,
    shooting: 50,
    passing: 50,
    dribbling: 50,
    defending: 50,
    ...overrides,
  };
}

/** Exemplo completo da RN20: Águias FC × Delta FC, os dois no 2-1-1. */
const AGUIAS = [
  starter(34, 'Otto Rangel', 'ATA', { shooting: 75 }),
  starter(31, 'Davi Lins', 'LAT', { dribbling: 74, defending: 66 }, 'MAL_CONDICIONADO'),
  starter(30, 'Rui Prado', 'GOL', { defending: 77 }),
  starter(33, 'Lauro Neves', 'MEI', { passing: 82 }),
  starter(32, 'Téo Brandão', 'ZAG', { defending: 84 }),
];
const DELTA = [
  starter(40, 'Ivo Teles', 'GOL', { defending: 72 }),
  starter(41, 'Hugo Vaz', 'ZAG', { defending: 84 }),
  starter(42, 'Lino Matos', 'LAT', { dribbling: 79, defending: 63 }),
  starter(43, 'Nei Soares', 'MEI', { passing: 70 }),
  starter(44, 'Ugo Falcão', 'ATA', { shooting: 81 }),
];

describe('conditionedValue (RN20 › 3)', () => {
  it.each([
    [74, 'MAL_CONDICIONADO', 63],
    [50, 'MAL_CONDICIONADO', 43],
    [66, 'MAL_CONDICIONADO', 56],
    [100, 'MAL_CONDICIONADO', 85],
    [1, 'MAL_CONDICIONADO', 1],
    [74, 'APTO', 74],
  ] as const)('%i com %s → %i', (value, condition, expected) => {
    expect(conditionedValue(value, condition)).toBe(expected);
  });
});

describe('playMatch (RN20)', () => {
  it('reproduz a tabela de duelos do exemplo oficial: Águias FC 1 × 2 Delta FC', () => {
    const outcome = playMatch(AGUIAS, DELTA);

    expect(
      outcome.duels.map((duel) => [
        duel.order,
        duel.attackingSide,
        duel.attacker.player.name,
        duel.attacker.attribute,
        duel.attacker.value,
        duel.defender.player.name,
        duel.defender.attribute,
        duel.defender.value,
        duel.goal,
      ]),
    ).toEqual([
      [1, 'home', 'Otto Rangel', 'shooting', 75, 'Ivo Teles', 'defending', 72, true],
      [2, 'home', 'Lauro Neves', 'passing', 82, 'Hugo Vaz', 'defending', 84, false],
      [3, 'home', 'Davi Lins', 'dribbling', 63, 'Lino Matos', 'defending', 63, false],
      [4, 'away', 'Ugo Falcão', 'shooting', 81, 'Rui Prado', 'defending', 77, true],
      [5, 'away', 'Nei Soares', 'passing', 70, 'Téo Brandão', 'defending', 84, false],
      [6, 'away', 'Lino Matos', 'dribbling', 79, 'Davi Lins', 'defending', 56, true],
    ]);
    expect(outcome).toMatchObject({ homeGoals: 1, awayGoals: 2, result: 'VISITANTE' });
  });

  it('a ordem dos ids recebidos não muda nada (titulares seguem a ordem do elenco)', () => {
    expect(playMatch([...AGUIAS].reverse(), [...DELTA].reverse())).toEqual(
      playMatch(AGUIAS, DELTA),
    );
  });

  it('duelo empatado não é gol; times iguais empatam 0 × 0', () => {
    const team = (offset: number) => [
      starter(offset + 1, 'Goleiro', 'GOL'),
      starter(offset + 2, 'Zagueiro', 'ZAG'),
      starter(offset + 3, 'Lateral', 'LAT'),
      starter(offset + 4, 'Meia', 'MEI'),
      starter(offset + 5, 'Atacante', 'ATA'),
    ];
    const outcome = playMatch(team(0), team(10));

    expect(outcome.duels.every((duel) => !duel.goal)).toBe(true);
    expect(outcome).toMatchObject({ homeGoals: 0, awayGoals: 0, result: 'EMPATE' });
  });

  it('com a mesma escalação, o resultado é sempre o mesmo (sem sorteio)', () => {
    expect(playMatch(AGUIAS, DELTA)).toEqual(playMatch(AGUIAS, DELTA));
  });

  it('o mesmo time nos dois lados marca o mesmo número de gols', () => {
    const outcome = playMatch(AGUIAS, AGUIAS);
    expect(outcome.homeGoals).toBe(outcome.awayGoals);
  });

  it.each([
    [
      '3-1',
      ['ZAG', 'LAT', 'LAT', 'ATA'],
      ['shooting', 'dribbling', 'dribbling'],
      ['GOL', 'ZAG', 'LAT'],
    ],
    [
      '2-2',
      ['ZAG', 'LAT', 'ATA', 'ATA'],
      ['shooting', 'shooting', 'dribbling'],
      ['GOL', 'ZAG', 'LAT'],
    ],
    [
      '2-1-1',
      ['ZAG', 'LAT', 'MEI', 'ATA'],
      ['shooting', 'passing', 'dribbling'],
      ['GOL', 'ZAG', 'LAT'],
    ],
    [
      '1-2-1',
      ['ZAG', 'MEI', 'MEI', 'ATA'],
      ['shooting', 'passing', 'passing'],
      ['GOL', 'ZAG', 'MEI'],
    ],
  ] as const)(
    'formação %s: atacam 4º, 3º e 2º com o atributo da posição; defendem goleiro, 1º e 2º',
    (_, line, attackAttributes, defenderPositions) => {
      const team = [
        starter(1, 'Goleiro', 'GOL'),
        ...line.map((position, index) => starter(index + 2, `Jogador ${index}`, position)),
      ];
      const outcome = playMatch(team, team);

      expect(outcome.duels.slice(0, 3).map((duel) => duel.attacker.attribute)).toEqual(
        attackAttributes,
      );
      expect(outcome.duels.slice(0, 3).map((duel) => duel.defender.player.position)).toEqual(
        defenderPositions,
      );
      expect(outcome.duels.every((duel) => duel.defender.attribute === 'defending')).toBe(true);
      expect(outcome.duels.map((duel) => duel.order)).toEqual([1, 2, 3, 4, 5, 6]);
    },
  );

  it('no 1-2-1, os dois MEI seguem o nome: o que vem antes é o 2º e ataca no duelo 3', () => {
    const team = [
      starter(1, 'Goleiro', 'GOL'),
      starter(2, 'Zé Zagueiro', 'ZAG'),
      starter(3, 'Bruno Meia', 'MEI', { passing: 90 }),
      starter(4, 'Ana Meia', 'MEI', { passing: 10 }),
      starter(5, 'Atacante', 'ATA'),
    ];
    const outcome = playMatch(team, team);

    expect(outcome.duels[1].attacker.player.name).toBe('Bruno Meia');
    expect(outcome.duels[2].attacker.player.name).toBe('Ana Meia');
    expect(outcome.duels[2].defender.player.name).toBe('Ana Meia');
  });

  it('só os atributos da posição contam: overall, potencial e outros não entram', () => {
    const strongShooterAsMei = playMatch(
      [
        starter(1, 'Goleiro', 'GOL'),
        starter(2, 'Zagueiro', 'ZAG'),
        starter(3, 'Lateral', 'LAT'),
        starter(4, 'Meia', 'MEI', { shooting: 99, passing: 51 }),
        starter(5, 'Atacante', 'ATA'),
      ],
      [
        starter(11, 'Goleiro', 'GOL'),
        starter(12, 'Zagueiro', 'ZAG'),
        starter(13, 'Lateral', 'LAT'),
        starter(14, 'Meia', 'MEI'),
        starter(15, 'Atacante', 'ATA'),
      ],
    );
    expect(strongShooterAsMei.duels[1]).toMatchObject({
      attacker: { attribute: 'passing', value: 51 },
      goal: true,
    });
  });
});

describe('resultOf', () => {
  it.each([
    [2, 1, 'MANDANTE'],
    [1, 2, 'VISITANTE'],
    [3, 3, 'EMPATE'],
    [0, 0, 'EMPATE'],
  ] as const)('%i × %i → %s', (home, away, expected) => {
    expect(resultOf(home, away)).toBe(expected);
  });
});
