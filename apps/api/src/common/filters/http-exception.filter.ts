import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface CanonicalErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string | string[]) || exception.message;
        error = (resObj.error as string) || exception.name;
      }
    } else {
      // Unhandled system / database errors: sanitize client response to prevent CWE-209 information disclosure
      message = 'Internal server error. Please contact support with request ID.';
      error = 'Internal Server Error';
    }

    const errorPayload: CanonicalErrorResponse = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.requestId,
    };

    if (status >= 500) {
      const detail =
        exception instanceof Error ? `${exception.message}\n${exception.stack}` : String(exception);
      this.logger.error(
        `[${request.requestId || 'no-id'}] ${request.method} ${request.url} - ${status} ${error}: ${detail}`,
      );
    } else {
      this.logger.warn(
        `[${request.requestId || 'no-id'}] ${request.method} ${request.url} - ${status} ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json(errorPayload);
  }
}
