import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { QueryFailedError, TypeORMError } from 'typeorm';
import { Response } from 'express';

// 自定义异常过滤器: 装饰器 @Catch(TypeORMError) 指定该过滤器只捕获Typeorm异常
@Catch(TypeORMError)
export class TypeormFilter implements ExceptionFilter {
  catch(exception: TypeORMError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    let mysqlErrorNo = 0;
    let mysqlErrMsg = exception.message || 'Internal TypeORM Query Error';
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof QueryFailedError) {
      if (hasErrno(exception.driverError)) {
        mysqlErrorNo = exception.driverError.errno;
        switch (mysqlErrorNo) {
          case 1062:
            statusCode = HttpStatus.CONFLICT;
            mysqlErrMsg = 'This record already exists (duplicate entry).'; // '唯一index冲突';  1062 for dupciate entry of database error
            break;
          case 1406:
            statusCode = HttpStatus.BAD_REQUEST;
            mysqlErrMsg =
              'One of the fields is too long (e.g. URL is too long).';
            break;
        }
      }
    }

    response.status(statusCode).json({
      mysqlErrorNo,
      mysqlErrMsg: `local typeorm filter message: ${mysqlErrMsg}`,
      timestamp: new Date().toISOString(),
    });
  }
}

// helper type guard function
function hasErrno(error: unknown): error is { errno: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'errno' in error &&
    typeof (error as Record<string, unknown>).errno === 'number'
  );
}
