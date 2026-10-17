import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/** Registra uma linha por requisição: data e hora (do Logger), método, caminho e status. */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    response.on('finish', () => {
      this.logger.log(`${request.method} ${request.originalUrl} ${response.statusCode}`);
    });
    next();
  }
}
