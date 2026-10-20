import { RecordedTransaction, summarizeTransactions } from './transaction-history';

const at = new Date('2026-11-02T13:15:00.000Z');

/** Compra e venda do Meia Lua (README 2.3.1 e 2.3.2), em centavos, como foram gravadas. */
const PURCHASE: RecordedTransaction = {
  type: 'COMPRA',
  playerName: 'Meia Lua',
  value: 3700,
  fee: 185,
  penalty: 0,
  profit: null,
  cashChange: -3885,
  createdAt: at,
};
const SALE: RecordedTransaction = {
  type: 'VENDA',
  playerName: 'Meia Lua',
  value: 4000,
  fee: 30,
  penalty: 400,
  profit: 300,
  cashChange: 3570,
  createdAt: at,
};
/** Venda com prejuízo da tabela da RN16: compra 50,00, venda 42,50, multa 8,50. */
const LOSS_SALE: RecordedTransaction = {
  ...SALE,
  value: 4250,
  fee: 0,
  penalty: 850,
  profit: -750,
  cashChange: 3400,
};
/** Venda sem lucro nem multa (fidelidade cumprida): 25,00 → 25,00. */
const EVEN_SALE: RecordedTransaction = {
  ...SALE,
  value: 2500,
  fee: 0,
  penalty: 0,
  profit: 0,
  cashChange: 2500,
};
const ZERO = { totalSpent: 0, totalReceived: 0, totalFees: 0, totalPenalties: 0, totalProfit: 0 };

describe('summarizeTransactions (RN17 › summary)', () => {
  it('histórico completo do exemplo: 38,85 / 35,70 / 2,15 / 4,00 / 3,00 (README 2.3.3)', () => {
    expect(summarizeTransactions([SALE, PURCHASE])).toEqual({
      totalSpent: 3885,
      totalReceived: 3570,
      totalFees: 215,
      totalPenalties: 400,
      totalProfit: 300,
    });
  });

  it('só VENDA (filtro type=VENDA): total_spent 0,00', () => {
    expect(summarizeTransactions([SALE])).toEqual({
      ...ZERO,
      totalReceived: 3570,
      totalFees: 30,
      totalPenalties: 400,
      totalProfit: 300,
    });
  });

  it('só COMPRA: soma value + fee, sem lucro, multa ou recebido', () => {
    const second = { ...PURCHASE, value: 2800, fee: 0, cashChange: -2800 };
    expect(summarizeTransactions([PURCHASE, second])).toEqual({
      ...ZERO,
      totalSpent: 6685,
      totalFees: 185,
    });
  });

  it('lucro com sinal: prejuízo diminui o total, venda sem lucro soma 0', () => {
    expect(summarizeTransactions([SALE, LOSS_SALE, EVEN_SALE])).toEqual({
      ...ZERO,
      totalReceived: 3570 + 3400 + 2500,
      totalFees: 30,
      totalPenalties: 400 + 850,
      totalProfit: 300 - 750,
    });
  });

  it('sem transações: todos os totais 0', () => {
    expect(summarizeTransactions([])).toEqual(ZERO);
  });
});
