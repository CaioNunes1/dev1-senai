import { Injectable, PipeTransform } from '@nestjs/common';
import { ResourceNotFoundError } from '../errors/domain-errors';

const MAX_ID = 2_147_483_647;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

/**
 * Converte o id da URL em número. Pela V8, id fora do formato
 * (como "abc", "0", "-1", "1.5", "01") ou acima de 2.147.483.647 conta como inexistente (404).
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!POSITIVE_INTEGER_PATTERN.test(value) || Number(value) > MAX_ID) {
      throw new ResourceNotFoundError('Recurso não encontrado.');
    }
    return Number(value);
  }
}
