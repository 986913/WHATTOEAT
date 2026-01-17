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
    let mysqlErrMsg = 'Internal TypeORM Query Error';
    if (exception instanceof QueryFailedError) {
      if (hasErrno(exception.driverError)) {
        mysqlErrorNo = exception.driverError.errno;
        if (mysqlErrorNo === 1062) {
          mysqlErrMsg = '唯一index(username)冲突'; // 1062 for dupciate entry of database error
        }
      }
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
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
