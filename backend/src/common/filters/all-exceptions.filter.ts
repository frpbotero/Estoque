import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Tratamento padronizado de erros: toda resposta de falha da API tem o mesmo
 * formato, o que simplifica o interceptor de erros do Angular.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const payload = body as Record<string, unknown>;
        message = (payload.message as string | string[]) ?? exception.message;
        error = (payload.error as string) ?? exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      message = mapped.message;
      error = mapped.error;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ') ?? 'campo';
        return {
          status: HttpStatus.CONFLICT,
          message: `Já existe um registro com o mesmo valor para: ${target}`,
          error: 'Conflict',
        };
      }
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referência inválida: o registro relacionado não existe',
          error: 'BadRequest',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Registro não encontrado',
          error: 'NotFound',
        };
      default:
        this.logger.error(`Prisma ${exception.code}: ${exception.message}`);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro ao acessar o banco de dados',
          error: 'DatabaseError',
        };
    }
  }
}
