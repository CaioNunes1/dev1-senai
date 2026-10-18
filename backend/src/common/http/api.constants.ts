export const API_PREFIX = 'api/v1';
export const API_DOCS_PATH = 'api/docs';

/** Caminho a partir da raiz do servidor, usado no cabeçalho `Location` (ex.: /api/v1/clubs/1). */
export function resourceLocation(resource: string, id: number): string {
  return `/${API_PREFIX}/${resource}/${id}`;
}
