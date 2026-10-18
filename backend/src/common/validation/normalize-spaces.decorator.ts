import { Transform } from 'class-transformer';
import { normalizeSpaces } from '../domain/text';

/** V4: normaliza os espaços de campos de texto antes da validação e da gravação. */
export function NormalizeSpaces(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeSpaces(value) : value,
  );
}
