import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const isHttpException = exception instanceof HttpException;

        const status = isHttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // Lấy message từ HttpException (bao gồm cả validation errors)
        let message: string | string[] = 'Internal server error';
        let error = 'Internal Server Error';

        if (isHttpException) {
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const res = exceptionResponse as Record<string, unknown>;
                message = (res.message as string | string[]) ?? exception.message;
                error = (res.error as string) ?? exception.name;
            }
        }

        const errorResponse = {
            statusCode: status,
            error,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
        };

        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `[${request.method}] ${request.url} → ${status}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
        } else {
            this.logger.warn(
                `[${request.method}] ${request.url} → ${status}: ${JSON.stringify(message)}`,
            );
        }

        response.status(status).json(errorResponse);
    }
}
