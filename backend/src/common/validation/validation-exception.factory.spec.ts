import { ValidationError } from 'class-validator';
import { InvalidInputError } from '../errors/domain-errors';
import { createValidationException } from './validation-exception.factory';

function validationError(partial: Partial<ValidationError>): ValidationError {
  return Object.assign(new ValidationError(), { property: 'field', children: [], ...partial });
}

describe('createValidationException', () => {
  it('devolve a primeira mensagem como texto', () => {
    const exception = createValidationException([
      validationError({ constraints: { isInt: 'idade deve ser um inteiro.' } }),
      validationError({ constraints: { isIn: 'posição inválida.' } }),
    ]);

    expect(exception).toBeInstanceOf(InvalidInputError);
    expect(exception.message).toBe('idade deve ser um inteiro.');
  });

  it('procura a mensagem em objetos aninhados', () => {
    const exception = createValidationException([
      validationError({
        children: [validationError({ constraints: { isDefined: 'campo obrigatório.' } })],
      }),
    ]);

    expect(exception.message).toBe('campo obrigatório.');
  });

  it('usa mensagem padrão quando não há restrição descrita', () => {
    expect(createValidationException([]).message).toBe('Dados inválidos.');
  });
});
