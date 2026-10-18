import { ValidateBy, ValidationArguments } from 'class-validator';

/**
 * Regra de validação de um campo: devolve a mensagem da primeira violação
 * encontrada ou `undefined` quando o valor é válido. Recebe o objeto inteiro
 * para regras que cruzam campos (como sigla e nome do clube).
 */
export type ValidationRule = (value: unknown, object: object) => string | undefined;

/**
 * Aplica uma regra de validação como decorator do class-validator. Uma única regra
 * por campo verifica as condições em ordem e devolve uma mensagem precisa, em vez
 * de vários decorators que falham juntos com mensagens genéricas.
 */
export function SatisfiesRule(rule: ValidationRule): PropertyDecorator {
  return ValidateBy({
    name: 'satisfiesRule',
    validator: {
      validate: (value: unknown, args: ValidationArguments) =>
        rule(value, args.object) === undefined,
      defaultMessage: (args: ValidationArguments) => rule(args.value, args.object) ?? '',
    },
  });
}
