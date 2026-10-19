import { z } from 'zod';
import {
  countCharacters,
  countWords,
  hasControlCharacters,
  normalizeSpaces,
  removeAccents,
} from '../../shared/lib/text';

/**
 * Validação antes do envio (RN10 e "Limites de cada campo" do enunciado), com as mesmas
 * regras e a mesma ordem do backend. Unicidade de nome e sigla e o limite de 20 clubes
 * dependem do banco: só a API confere, e a tela mostra o `message` dela (409).
 */
const NAME_LIMITS = { min: 3, max: 60 } as const;
const WORD_LIMITS = { min: 2, max: 5 } as const;
/** Só letras (categoria Unicode L, com ou sem acento), espaços, hífen e ponto. */
const NAME_ALLOWED_CHARACTERS = /^[\p{L} .-]+$/u;
const ACRONYM_FORMAT = /^[A-Z]{3}$/;
const LETTER = /\p{L}/u;

const nameField = z
  .string()
  .transform(normalizeSpaces)
  .pipe(
    z
      .string()
      .min(1, 'Informe o nome do clube.')
      .refine((name) => !hasControlCharacters(name), 'Remova tabulações e quebras de linha.')
      .refine((name) => {
        const length = countCharacters(name);
        return length >= NAME_LIMITS.min && length <= NAME_LIMITS.max;
      }, `Use de ${NAME_LIMITS.min} a ${NAME_LIMITS.max} caracteres.`)
      .refine(
        (name) => NAME_ALLOWED_CHARACTERS.test(name),
        'Use só letras, espaços, hífen e ponto (sem números).',
      )
      .refine((name) => {
        const words = countWords(name);
        return words >= WORD_LIMITS.min && words <= WORD_LIMITS.max;
      }, `Use de ${WORD_LIMITS.min} a ${WORD_LIMITS.max} palavras.`),
  );

const acronymField = z
  .string()
  .min(1, 'Informe a sigla.')
  .regex(ACRONYM_FORMAT, 'Use exatamente 3 letras maiúsculas de A a Z, sem acento.')
  .refine(
    (acronym) => [...acronym].some((letter) => letter !== acronym[0]),
    'A sigla não pode ter as três letras iguais.',
  );

/**
 * As três letras da sigla aparecem no nome, nessa ordem (não precisam ser seguidas), e a
 * primeira é a primeira letra do nome; ignora maiúsculas, minúsculas e acentos.
 */
export function acronymMatchesName(acronym: string, name: string): boolean {
  const nameLetters = [...removeAccents(name).toLowerCase()];
  const firstLetterIndex = nameLetters.findIndex((character) => LETTER.test(character));
  const [first, ...rest] = acronym.toLowerCase();
  if (firstLetterIndex === -1 || nameLetters[firstLetterIndex] !== first) {
    return false;
  }
  let searchFrom = firstLetterIndex + 1;
  for (const letter of rest) {
    const foundAt = nameLetters.indexOf(letter, searchFrom);
    if (foundAt === -1) {
      return false;
    }
    searchFrom = foundAt + 1;
  }
  return true;
}

/** A correspondência com o nome só é conferida quando nome e sigla já estão no formato. */
export const createClubSchema = z
  .object({ name: nameField, acronym: acronymField })
  .refine(({ name, acronym }) => acronymMatchesName(acronym, name), {
    path: ['acronym'],
    when: ({ issues }) => issues.length === 0,
    message: 'A sigla deve começar pela primeira letra do nome e usar letras do nome, nessa ordem.',
  });

/** Valores digitados no formulário, antes da normalização dos espaços do nome. */
export type CreateClubForm = z.input<typeof createClubSchema>;
