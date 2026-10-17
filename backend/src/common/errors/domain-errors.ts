/** Dado, formato ou parâmetro inválido (HTTP 400). */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

/** Regra de negócio violada pelo estado atual dos dados (HTTP 409). */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

/** Recurso inexistente ou excluído logicamente (HTTP 404). */
export class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}
