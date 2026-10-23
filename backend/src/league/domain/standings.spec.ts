import { computeStandings } from './standings';

describe('computeStandings (RN21)', () => {
  it('reproduz o exemplo oficial com 6 clubes e 4 partidas', () => {
    const clubs = [
      { id: 1, name: 'Águias FC' },
      { id: 2, name: 'Delta FC' },
      { id: 3, name: 'Gama SC' },
      { id: 4, name: 'Épsilon EC' },
      { id: 5, name: 'Mangue FC' },
      { id: 6, name: 'Tubarões EC' },
    ];
    const matches = [
      { homeClubId: 1, awayClubId: 2, homeGoals: 1, awayGoals: 2 },
      { homeClubId: 3, awayClubId: 4, homeGoals: 2, awayGoals: 1 },
      { homeClubId: 4, awayClubId: 1, homeGoals: 3, awayGoals: 2 },
      { homeClubId: 2, awayClubId: 3, homeGoals: 0, awayGoals: 1 },
    ];

    const rows = computeStandings(clubs, matches);

    expect(
      rows.map((row) => [row.position, row.clubName, row.points, row.goalDifference, row.goalsFor]),
    ).toEqual([
      [1, 'Gama SC', 6, 2, 3],
      [2, 'Épsilon EC', 3, 0, 4],
      [3, 'Delta FC', 3, 0, 2],
      [4, 'Mangue FC', 0, 0, 0],
      [5, 'Tubarões EC', 0, 0, 0],
      [6, 'Águias FC', 0, -2, 3],
    ]);
    expect(rows[0]).toEqual({
      position: 1,
      clubId: 3,
      clubName: 'Gama SC',
      played: 2,
      wins: 2,
      draws: 0,
      losses: 0,
      goalsFor: 3,
      goalsAgainst: 1,
      goalDifference: 2,
      points: 6,
    });
  });

  it('exemplo 2.4.3: Delta 2 × 1 Águias e Gama sem jogar', () => {
    const rows = computeStandings(
      [
        { id: 1, name: 'Águias FC' },
        { id: 2, name: 'Delta FC' },
        { id: 3, name: 'Gama SC' },
      ],
      [{ homeClubId: 1, awayClubId: 2, homeGoals: 1, awayGoals: 2 }],
    );
    expect(
      rows.map((row) => [row.position, row.clubId, row.played, row.losses, row.points]),
    ).toEqual([
      [1, 2, 1, 0, 3],
      [2, 3, 0, 0, 0],
      [3, 1, 1, 1, 0],
    ]);
  });

  it('empate vale 1 ponto para cada lado', () => {
    const rows = computeStandings(
      [
        { id: 1, name: 'B' },
        { id: 2, name: 'A' },
      ],
      [{ homeClubId: 1, awayClubId: 2, homeGoals: 1, awayGoals: 1 }],
    );
    expect(rows.map((row) => [row.clubName, row.draws, row.points])).toEqual([
      ['A', 1, 1],
      ['B', 1, 1],
    ]);
  });

  it('sem partidas: todos zerados, pelo nome sem acento; nomes iguais pelo id', () => {
    const rows = computeStandings(
      [
        { id: 9, name: 'Gama SC' },
        { id: 7, name: 'Águias FC' },
        { id: 3, name: 'Aguias FC' },
        { id: 5, name: 'Épsilon EC' },
      ],
      [],
    );
    expect(rows.map((row) => [row.position, row.clubId])).toEqual([
      [1, 3],
      [2, 7],
      [3, 5],
      [4, 9],
    ]);
    expect(rows.every((row) => row.played === 0 && row.points === 0)).toBe(true);
  });

  it('nenhum clube: lista vazia', () => {
    expect(computeStandings([], [])).toEqual([]);
  });
});
