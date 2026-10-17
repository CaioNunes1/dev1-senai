import { ValidationError } from 'class-validator';
import { InvalidInputError } from '../errors/domain-errors';

const FALLBACK_MESSAGE = 'Dados inválidos.';

/**
 * O ValidationPipe padrão devolve `message` como lista; o contrato da API exige texto.
 * Usa a primeira restrição violada, percorrendo objetos aninhados.
 */
export function createValidationException(errors: ValidationError[]): InvalidInputError {
  return new InvalidInputError(findFirstMessage(errors) ?? FALLBACK_MESSAGE);
}

function findFirstMessage(errors: ValidationError[]): string | undefined {
  for (const error of errors) {
    const constraintMessage = Object.values(error.constraints ?? {})[0];
    if (constraintMessage) {
      return constraintMessage;
    }
    const nestedMessage = findFirstMessage(error.children ?? []);
    if (nestedMessage) {
      return nestedMessage;
    }
  }
  return undefined;
}
