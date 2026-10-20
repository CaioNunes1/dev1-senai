import { RecordedTransaction } from './transaction-history';
import { CSV_HEADER, escapeCsvText, toTransactionsCsv } from './transactions-csv';

const SALE: RecordedTransaction = {
  type: 'VENDA',
  playerName: 'Meia Lua',
  value: 4000,
  fee: 30,
  penalty: 400,
  profit: 300,
  cashChange: 3570,
  createdAt: new Date('2026-11-05T19:40:00.000Z'),
};
const PURCHASE: RecordedTransaction = {
  type: 'COMPRA',
  playerName: 'Meia Lua',
  value: 3700,
  fee: 185,
  penalty: 0,
  profit: null,
  cashChange: -3885,
  createdAt: new Date('2026-11-02T13:15:00.000Z'),
};

describe('toTransactionsCsv (RN18)', () => {
  it('exemplo do enunciado, byte a byte: UTF-8 sem BOM, LF em todas as linhas', () => {
    const csv = toTransactionsCsv([SALE, PURCHASE]);
    const expected =
      'data_hora;tipo;jogador;valor;taxa_ou_comissao;multa;lucro;variacao_caixa\n' +
      '2026-11-05T16:40:00-03:00;VENDA;Meia Lua;40,00;0,30;4,00;3,00;35,70\n' +
      '2026-11-02T10:15:00-03:00;COMPRA;Meia Lua;37,00;1,85;0,00;;-38,85\n';

    expect(csv).toBe(expected);
    expect(Buffer.from(csv, 'utf8').equals(Buffer.from(expected, 'utf8'))).toBe(true);
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
    expect(csv).not.toContain('\r');
  });

  it('sem transações: só o cabeçalho, terminado em LF', () => {
    expect(toTransactionsCsv([])).toBe(`${CSV_HEADER}\n`);
  });

  it('mantém a ordem recebida e não reordena', () => {
    const lines = toTransactionsCsv([PURCHASE, SALE]).split('\n').filter(Boolean);
    expect(lines.map((line) => line.split(';')[1])).toEqual(['tipo', 'COMPRA', 'VENDA']);
  });

  it.each([
    // lucro, multa, variação → colunas esperadas
    [-750, 850, 3400, '-7,50', '8,50', '34,00'],
    [0, 0, 2500, '0,00', '0,00', '25,00'],
    [123456, 1000, 99999999, '1234,56', '10,00', '999999,99'],
  ])(
    'lucro %i, multa %i, variação %i → %s;%s;%s (sem separador de milhar)',
    (profit, penalty, cashChange, profitText, penaltyText, cashText) => {
      const [, line] = toTransactionsCsv([{ ...SALE, profit, penalty, cashChange }]).split('\n');
      expect(line.split(';').slice(5)).toEqual([penaltyText, profitText, cashText]);
    },
  );

  it('nome com acento sai em UTF-8 sem alteração', () => {
    const [, line] = toTransactionsCsv([{ ...SALE, playerName: 'Ícaro Mendes Çaçula' }]).split(
      '\n',
    );
    expect(line.split(';')[2]).toBe('Ícaro Mendes Çaçula');
    expect(Buffer.from(line, 'utf8').includes(Buffer.from('Ícaro', 'utf8'))).toBe(true);
  });

  it('linha completa com nome entre aspas', () => {
    const [, line] = toTransactionsCsv([{ ...PURCHASE, playerName: 'Zé "Foguete" Lima' }]).split(
      '\n',
    );
    expect(line).toBe(
      '2026-11-02T10:15:00-03:00;COMPRA;"Zé ""Foguete"" Lima";37,00;1,85;0,00;;-38,85',
    );
  });
});

describe('escapeCsvText (RN18 › 6)', () => {
  it.each([
    ['Meia Lua', 'Meia Lua'],
    ['Zé "Foguete" Lima', '"Zé ""Foguete"" Lima"'],
    ['Ana; Bia', '"Ana; Bia"'],
    ['"Aspas" e; ponto', '"""Aspas"" e; ponto"'],
    ['Ícaro Mendes', 'Ícaro Mendes'],
  ])('%s → %s', (text, expected) => {
    expect(escapeCsvText(text)).toBe(expected);
  });
});
