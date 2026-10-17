import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { InvalidInputError } from '../errors/domain-errors';

/**
 * V1: o corpo das requisições que o recebem precisa ser um objeto JSON.
 * Arrays, valores simples e corpo ausente são recusados com 400.
 */
@Injectable()
export class PlainObjectBodyPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const isWholeBody = metadata.type === 'body' && metadata.data === undefined;
    if (isWholeBody && !isPlainObject(value)) {
      throw new InvalidInputError('O corpo da requisição deve ser um objeto JSON.');
    }
    return value;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
