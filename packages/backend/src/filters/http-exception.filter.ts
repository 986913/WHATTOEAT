import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '@nestjs/common';

// 自定义Global异常过滤器: 装饰器 @Catch(HttpException) 指定该过滤器只捕获 HttpException 类型的异常
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  /* 实现 ExceptionFilter 接口的 catch 方法, 用于捕获异常:
      exception 参数是被捕获的异常对象, 
      host 参数是上下文对象
  */
  catch(exception: HttpException, host: ArgumentsHost) {
    this.logger.error(exception.message, exception.stack);

    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const status = exception.getStatus();

    response.status(status).json({
      code: status,
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.url,
      message: exception.message || HttpException.name,
    });
    // throw new Error('Method not implemented.');
  }
}
