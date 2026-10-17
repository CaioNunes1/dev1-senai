import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  BusinessRuleError,
  InvalidInputError,
  ResourceNotFoundError,
} from '../errors/domain-errors';

interface ErrorResponse {
  status: number;
  message: string;
}

const FRAMEWORK_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Requisição inválida: verifique o caminho e o corpo JSON.',
  [HttpStatus.NOT_FOUND]: 'Recurso não encontrado.',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'Método não permitido.',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Corpo da requisição muito grande.',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'Tipo de conteúdo não suportado.',
};

const GENERIC_CLIENT_ERROR_MESSAGE = 'Requisição recusada.';
const INTERNAL_ERROR_MESSAGE = 'Erro interno inesperado. A operação não foi concluída.';

/**
 * Tratamento central de erros: toda recusa responde `{ "message": string }`,
 * em JSON e sem stack trace (Convenções da API e V9).
 *
 * Erros próprios da aplicação levam a mensagem escrita por ela. Erros HTTP gerados
 * pelo framework (rota inexistente, JSON malformado) recebem um texto padrão por status,
 * para não expor mensagens internas de bibliotecas.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.toErrorResponse(exception);
    response.status(status).json({ message });
  }

  private toErrorResponse(exception: unknown): ErrorResponse {
    if (exception instanceof InvalidInputError) {
      return { status: HttpStatus.BAD_REQUEST, message: exception.message };
    }
    if (exception instanceof ResourceNotFoundError) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message };
    }
    if (exception instanceof BusinessRuleError) {
      return { status: HttpStatus.CONFLICT, message: exception.message };
    }
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const status = exception.getStatus();
      return { status, message: FRAMEWORK_MESSAGES[status] ?? GENERIC_CLIENT_ERROR_MESSAGE };
    }
    this.logger.error(
      'Erro não tratado',
      exception instanceof Error ? exception.stack : String(exception),
    );
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: INTERNAL_ERROR_MESSAGE };
  }
}
