import { formatBrasiliaDateTime, parseBrasiliaDateTime } from './datetime';

describe('parseBrasiliaDateTime (RN01)', () => {
  it.each([
    ['2027-03-02T10:15-03:00', '2027-03-02T13:15:00.000Z'],
    ['2026-12-31T23:59-03:00', '2027-01-01T02:59:00.000Z'],
    ['2028-02-29T00:00-03:00', '2028-02-29T03:00:00.000Z'],
    ['2000-02-29T12:00-03:00', '2000-02-29T15:00:00.000Z'],
  ])('%s → %s (UTC)', (text, expectedIso) => {
    expect(parseBrasiliaDateTime(text)?.toISOString()).toBe(expectedIso);
  });

  it.each([
    ['2027-03-02T10:15', 'sem o −03:00'],
    ['2027-03-02T10:15Z', 'outro fuso'],
    ['2027-03-02T10:15-02:00', 'outro deslocamento'],
    ['2027-03-02T10:15:00-03:00', 'com segundos'],
    ['2027-03-02 10:15-03:00', 'sem o T'],
    ['27-03-02T10:15-03:00', 'ano com 2 dígitos'],
    ['2027-3-2T10:15-03:00', 'mês e dia sem zero'],
    ['2027-02-30T10:15-03:00', '30 de fevereiro'],
    ['2027-02-29T10:15-03:00', '29 de fevereiro fora de ano bissexto'],
    ['2100-02-29T10:15-03:00', '2100 não é bissexto'],
    ['2027-04-31T10:15-03:00', '31 de abril'],
    ['2027-13-01T10:15-03:00', 'mês 13'],
    ['2027-00-10T10:15-03:00', 'mês 0'],
    ['2027-03-00T10:15-03:00', 'dia 0'],
    ['2027-03-02T24:00-03:00', '24:00'],
    ['2027-03-02T10:60-03:00', 'minuto 60'],
    [' 2027-03-02T10:15-03:00', 'espaço antes'],
  ])('recusa %s (%s)', (text) => {
    expect(parseBrasiliaDateTime(text)).toBeUndefined();
  });
});

describe('formatBrasiliaDateTime (RN01)', () => {
  it.each([
    ['2026-11-02T13:15:00.000Z', '2026-11-02T10:15:00-03:00'],
    ['2026-11-05T19:40:59.999Z', '2026-11-05T16:40:59-03:00'],
    ['2027-01-01T02:59:00.000Z', '2026-12-31T23:59:00-03:00'],
  ])('%s → %s', (iso, expected) => {
    expect(formatBrasiliaDateTime(new Date(iso))).toBe(expected);
  });

  it('formata de volta exatamente a data recebida', () => {
    const parsed = parseBrasiliaDateTime('2027-03-02T10:15-03:00');
    expect(parsed && formatBrasiliaDateTime(parsed)).toBe('2027-03-02T10:15:00-03:00');
  });
});
