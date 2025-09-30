import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Response } from 'express';

@Catch(PrismaClientKnownRequestError)
export class PrismaKnownErrorFilter implements ExceptionFilter {
	private handleNotFoundException(
		exception: PrismaClientKnownRequestError,
		response: Response,
	) {
		response.status(HttpStatus.NOT_FOUND).json({
			statusCode: HttpStatus.NOT_FOUND,
			error: 'Not found',
			message: `Such ${exception.meta?.modelName} does not exist`,
		});
	}

	private handleUniqueConstraintFailedException(
		exception: PrismaClientKnownRequestError,
		response: Response,
	) {
		response.status(HttpStatus.BAD_REQUEST).json({
			statusCode: HttpStatus.BAD_REQUEST,
			error: 'Bad request',
			message: `${exception.meta?.modelName} with such ${exception.meta?.target.join(', ')} already exists`,
		});
	}

	catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
		const PRISMA_NOT_FOUND_CODE = 'P2025';
		const UNIQUE_CONSTRAINT_FAILED_CODE = 'P2002';

		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		Logger.error({ exception });
		if (exception.code === PRISMA_NOT_FOUND_CODE) {
			this.handleNotFoundException(exception, response);
			return;
		}

		if (exception.code === UNIQUE_CONSTRAINT_FAILED_CODE) {
			this.handleUniqueConstraintFailedException(exception, response);
			return;
		}

		response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			error: 'Internal Server Error',
			message: `Unhandled database exception`,
		});
	}
}
