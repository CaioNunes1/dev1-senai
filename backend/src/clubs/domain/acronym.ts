import { removeAccents } from '../../common/domain/text';

const LETTER = /\p{L}/u;

/**
 * Limites de cada campo › `acronym`: as três letras da sigla aparecem no nome, nessa
 * ordem (não precisam ser consecutivas), sem diferenciar maiúsculas, minúsculas e
 * acentos, e a primeira delas é a primeira letra do nome.
 */
export function acronymMatchesName(acronym: string, name: string): boolean {
  const comparableName = removeAccents(name).toLowerCase();
  const comparableAcronym = acronym.toLowerCase();
  const firstLetterIndex = [...comparableName].findIndex((character) => LETTER.test(character));
  const nameCharacters = [...comparableName].slice(firstLetterIndex);

  if (firstLetterIndex === -1 || nameCharacters[0] !== comparableAcronym[0]) {
    return false;
  }
  let searchFrom = 1;
  for (const letter of comparableAcronym.slice(1)) {
    const foundAt = nameCharacters.indexOf(letter, searchFrom);
    if (foundAt === -1) {
      return false;
    }
    searchFrom = foundAt + 1;
  }
  return true;
}

/** Limites de cada campo › `acronym`: as três letras não podem ser todas iguais. */
export function hasAllSameLetters(acronym: string): boolean {
  return [...acronym].every((letter) => letter === acronym[0]);
}
