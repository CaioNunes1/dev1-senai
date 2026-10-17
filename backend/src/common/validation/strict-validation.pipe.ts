import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { createValidationException } from './validation-exception.factory';

/**
 * ValidationPipe que valida e limpa DTOs (V2, V5, V6, V7) sem converter valores primitivos.
 *
 * Com `transform: true`, o pipe padrão converte ids e query params pelo tipo TypeScript
 * ("01" → 1, "TRUE" → false) antes dos pipes da rota, o que aceitaria formatos que a API
 * deve recusar (V5, V8). Aqui eles chegam como texto aos parsers estritos de cada rota.
 */
export class StrictValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: createValidationException,
    });
  }

  protected override transformPrimitive(value: unknown, _metadata: ArgumentMetadata): unknown {
    return value;
  }
}
