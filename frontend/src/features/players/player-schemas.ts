import { z } from 'zod';
import {
  countCharacters,
  countWords,
  hasControlCharacters,
  normalizeSpaces,
} from '../../shared/lib/text';
import { POSITIONS } from './api';

/**
 * Validação antes do envio (F2 › Formulários): obrigatórios, formato e tamanho do nome e
 * faixas de um campo só. As regras que cruzam campos (idade × agilidade, soma dos atributos,
 * potencial × atributos) ficam na API, e a tela mostra o `message` dela.
 */
const PLAYER_FIELD_LIMITS = {
  name: { min: 3, max: 100 },
  agility: { min: 1, max: 100 },
  age: { min: 16, max: 45 },
  attribute: { min: 1, max: 99 },
} as const;

type Limits = { readonly min: number; readonly max: number };

const DIGIT = /[0-9]/;
const INTEGER_TEXT = /^\d+$/;

/** Texto do campo → número JSON inteiro; vazio, fração ou texto viram erro, nunca zero. */
function integerField(requiredMessage: string, limits: Limits, rangeMessage: string) {
  return z
    .string()
    .trim()
    .min(1, requiredMessage)
    .regex(INTEGER_TEXT, rangeMessage)
    .transform(Number)
    .pipe(z.number().int().min(limits.min, rangeMessage).max(limits.max, rangeMessage));
}

const nameField = z
  .string()
  .transform(normalizeSpaces)
  .pipe(
    z
      .string()
      .min(1, 'Informe o nome.')
      .refine((name) => !hasControlCharacters(name), 'Remova tabulações e quebras de linha.')
      .refine((name) => {
        const length = countCharacters(name);
        return length >= PLAYER_FIELD_LIMITS.name.min && length <= PLAYER_FIELD_LIMITS.name.max;
      }, `Use de ${PLAYER_FIELD_LIMITS.name.min} a ${PLAYER_FIELD_LIMITS.name.max} caracteres.`)
      .refine((name) => countWords(name) >= 2, 'Informe pelo menos duas palavras.')
      .refine((name) => !DIGIT.test(name), 'O nome não pode ter números.'),
  );

const positionField = z.enum(POSITIONS, { error: 'Escolha a posição.' });

const ageField = integerField(
  'Informe a idade.',
  PLAYER_FIELD_LIMITS.age,
  `Use uma idade de ${PLAYER_FIELD_LIMITS.age.min} a ${PLAYER_FIELD_LIMITS.age.max} anos.`,
);

const agilityField = integerField(
  'Informe a agilidade.',
  PLAYER_FIELD_LIMITS.agility,
  `Use um valor inteiro de ${PLAYER_FIELD_LIMITS.agility.min} a ${PLAYER_FIELD_LIMITS.agility.max}.`,
);

function attributeField(requiredMessage: string) {
  return integerField(
    requiredMessage,
    PLAYER_FIELD_LIMITS.attribute,
    `Use um valor inteiro de ${PLAYER_FIELD_LIMITS.attribute.min} a ${PLAYER_FIELD_LIMITS.attribute.max}.`,
  );
}

export const createPlayerSchema = z.object({
  name: nameField,
  position: positionField,
  age: ageField,
  agility: agilityField,
  pace: attributeField('Informe a velocidade.'),
  shooting: attributeField('Informe a finalização.'),
  passing: attributeField('Informe o passe.'),
  dribbling: attributeField('Informe o drible.'),
  defending: attributeField('Informe a defesa.'),
  physical: attributeField('Informe o físico.'),
  potential: attributeField('Informe o potencial.'),
});

/** Valores digitados no formulário (texto), antes da conversão do Zod. */
export type CreatePlayerForm = z.input<typeof createPlayerSchema>;

/**
 * Edição (RN08): nome, posição, agilidade e idade. A idade não pode diminuir; a tela
 * impede antes de enviar, como o enunciado permite (a API também recusa com 409).
 */
export function editPlayerSchema(currentAge: number) {
  return z.object({
    name: nameField,
    position: positionField,
    agility: agilityField,
    age: ageField.refine(
      (age) => age >= currentAge,
      `A idade não pode diminuir (atual: ${currentAge}).`,
    ),
  });
}

export type EditPlayerForm = z.input<ReturnType<typeof editPlayerSchema>>;
