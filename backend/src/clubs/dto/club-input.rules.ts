import { countCharacters, countWords, hasControlCharacters } from '../../common/domain/text';
import { acronymMatchesName, hasAllSameLetters } from '../domain/acronym';

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 60;
const NAME_MIN_WORDS = 2;
const NAME_MAX_WORDS = 5;
/** Só letras (categoria Unicode L, com ou sem acento), espaços, hífen e ponto. */
const NAME_ALLOWED_CHARACTERS = /^[\p{L} .-]+$/u;
const ACRONYM_FORMAT = /^[A-Z]{3}$/;

/**
 * Limites de cada campo › `name` (Clube). Recebe o valor já normalizado pela V4;
 * texto que ficou vazio conta como ausente.
 */
export function clubNameRule(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return 'O nome do clube é obrigatório.';
  }
  if (typeof value !== 'string') {
    return 'O nome do clube deve ser um texto.';
  }
  if (hasControlCharacters(value)) {
    return 'O nome do clube não pode conter caracteres de controle.';
  }
  const length = countCharacters(value);
  if (length < NAME_MIN_LENGTH || length > NAME_MAX_LENGTH) {
    return `O nome do clube deve ter de ${NAME_MIN_LENGTH} a ${NAME_MAX_LENGTH} caracteres.`;
  }
  if (!NAME_ALLOWED_CHARACTERS.test(value)) {
    return 'O nome do clube aceita só letras, espaços, hífen e ponto.';
  }
  const words = countWords(value);
  if (words < NAME_MIN_WORDS || words > NAME_MAX_WORDS) {
    return `O nome do clube deve ter de ${NAME_MIN_WORDS} a ${NAME_MAX_WORDS} palavras.`;
  }
  return undefined;
}

/** Limites de cada campo › `acronym`. A correspondência com o nome só é conferida com um nome em texto. */
export function acronymRule(value: unknown, club: object): string | undefined {
  if (value === undefined || value === null) {
    return 'A sigla é obrigatória.';
  }
  if (typeof value !== 'string') {
    return 'A sigla deve ser um texto.';
  }
  if (!ACRONYM_FORMAT.test(value)) {
    return 'A sigla deve ter exatamente 3 letras maiúsculas de A a Z, sem acento.';
  }
  if (hasAllSameLetters(value)) {
    return 'A sigla não pode ter as três letras iguais.';
  }
  const { name } = club as { name?: unknown };
  if (typeof name === 'string' && !acronymMatchesName(value, name)) {
    return 'A sigla deve começar pela primeira letra do nome e usar letras que aparecem no nome, nessa ordem.';
  }
  return undefined;
}
