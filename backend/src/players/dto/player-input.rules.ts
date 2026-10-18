import { countCharacters, countWords, hasControlCharacters } from '../../common/domain/text';
import { PLAYER_LIMITS } from '../domain/player.limits';
import { CONDITIONS, POSITIONS, TechnicalAttributes } from '../domain/player.types';

type Range = { readonly min: number; readonly max: number };

const DIGIT = /[0-9]/;
const ATTRIBUTE_NAMES: readonly (keyof TechnicalAttributes)[] = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
];

const isMissing = (value: unknown) => value === undefined || value === null;

/** V2: número JSON inteiro (`50.0` chega como 50 e é aceito; `"50"` e `50.5` não). */
const isIntegerInRange = (value: unknown, range: Range): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= range.min && value <= range.max;

function integerRule(field: string, value: unknown, range: Range): string | undefined {
  if (isMissing(value)) {
    return `O campo ${field} é obrigatório.`;
  }
  if (!isIntegerInRange(value, range)) {
    return `O campo ${field} deve ser um número inteiro de ${range.min} a ${range.max}.`;
  }
  return undefined;
}

function listRule(field: string, value: unknown, allowed: readonly string[]): string | undefined {
  if (isMissing(value)) {
    return `O campo ${field} é obrigatório.`;
  }
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return `O campo ${field} deve ser um destes: ${allowed.join(', ')}.`;
  }
  return undefined;
}

/** Os seis atributos, se todos forem válidos; senão, o erro é de cada atributo. */
function validAttributes(player: object): number[] | undefined {
  const values = ATTRIBUTE_NAMES.map((name) => (player as Record<string, unknown>)[name]);
  return values.every((value) => isIntegerInRange(value, PLAYER_LIMITS.attribute))
    ? values
    : undefined;
}

function validAge(player: object): number | undefined {
  const { age } = player as { age?: unknown };
  return isIntegerInRange(age, PLAYER_LIMITS.age) ? age : undefined;
}

/** `name` do jogador, já normalizado pela V4: 3 a 100 caracteres, 2+ palavras, sem dígitos. */
export function playerNameRule(value: unknown): string | undefined {
  const { nameLength, nameMinWords } = PLAYER_LIMITS;
  if (isMissing(value) || value === '') {
    return 'O campo name é obrigatório.';
  }
  if (typeof value !== 'string') {
    return 'O campo name deve ser um texto.';
  }
  if (hasControlCharacters(value)) {
    return 'O campo name não pode conter caracteres de controle.';
  }
  const length = countCharacters(value);
  if (length < nameLength.min || length > nameLength.max) {
    return `O campo name deve ter de ${nameLength.min} a ${nameLength.max} caracteres.`;
  }
  if (countWords(value) < nameMinWords) {
    return `O campo name deve ter pelo menos ${nameMinWords} palavras.`;
  }
  if (DIGIT.test(value)) {
    return 'O campo name não pode conter dígitos.';
  }
  return undefined;
}

export function positionRule(value: unknown): string | undefined {
  return listRule('position', value, POSITIONS);
}

export function conditionRule(value: unknown): string | undefined {
  return listRule('condition', value, CONDITIONS);
}

export function ageRule(value: unknown): string | undefined {
  return integerRule('age', value, PLAYER_LIMITS.age);
}

/** `agility`: 1 a 100; com 35 anos ou mais, no máximo 85 (regra que cruza com `age`). */
export function agilityRule(value: unknown, player: object): string | undefined {
  const { veteranAgility } = PLAYER_LIMITS;
  const error = integerRule('agility', value, PLAYER_LIMITS.agility);
  if (error) {
    return error;
  }
  const age = validAge(player);
  if (
    age !== undefined &&
    age >= veteranAgility.fromAge &&
    (value as number) > veteranAgility.max
  ) {
    return `Com ${veteranAgility.fromAge} anos ou mais, agility deve ser no máximo ${veteranAgility.max}.`;
  }
  return undefined;
}

/** Um dos seis atributos: 1 a 99; a soma dos seis não pode passar de 480. */
export function attributeRule(field: keyof TechnicalAttributes) {
  return (value: unknown, player: object): string | undefined => {
    const error = integerRule(field, value, PLAYER_LIMITS.attribute);
    if (error) {
      return error;
    }
    const attributes = validAttributes(player);
    const sum = attributes?.reduce((total, attribute) => total + attribute, 0) ?? 0;
    if (sum > PLAYER_LIMITS.attributesMaxSum) {
      return `A soma dos seis atributos não pode passar de ${PLAYER_LIMITS.attributesMaxSum} (soma enviada: ${sum}).`;
    }
    return undefined;
  };
}

/**
 * `potential`: 1 a 99 e maior ou igual ao maior dos seis atributos (RN06); no cadastro
 * com 33 anos ou mais, igual ao maior dos seis atributos.
 */
export function potentialRule(value: unknown, player: object): string | undefined {
  const error = integerRule('potential', value, PLAYER_LIMITS.potential);
  const attributes = validAttributes(player);
  if (error || attributes === undefined) {
    return error;
  }
  const highestAttribute = Math.max(...attributes);
  const potential = value as number;
  const age = validAge(player);
  if (age !== undefined && age >= PLAYER_LIMITS.potentialFixedFromAge) {
    return potential === highestAttribute
      ? undefined
      : `Com ${PLAYER_LIMITS.potentialFixedFromAge} anos ou mais, potential deve ser igual ao maior atributo (${highestAttribute}).`;
  }
  return potential >= highestAttribute
    ? undefined
    : `O campo potential deve ser maior ou igual ao maior atributo (${highestAttribute}).`;
}
