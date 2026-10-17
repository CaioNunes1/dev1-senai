import { ResourceNotFoundError } from '../errors/domain-errors';
import { ParseIdPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it.each([
    ['1', 1],
    ['42', 42],
    ['2147483647', 2_147_483_647],
  ])('aceita %s', (value, expected) => {
    expect(pipe.transform(value)).toBe(expected);
  });

  it.each(['abc', '0', '-1', '1.5', '01', '+1', '1e3', ' 1', '', '2147483648'])(
    'trata "%s" como recurso inexistente',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(ResourceNotFoundError);
    },
  );
});
