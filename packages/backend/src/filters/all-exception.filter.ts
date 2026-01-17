import {
  ExceptionFilter,
  HttpException,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ArgumentsHost, Catch } from '@nestjs/common';
import { Request, Response } from 'express';

// 自定义Global异常过滤器: 装饰器 @Catch() 指定该过滤器捕获所有异常(兜底)，包括非HTTP异常, HttpException异常, TypeORM异常等等
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  /* 实现 ExceptionFilter 接口的 catch 方法, 用于捕获异常:
      exception 参数是被捕获的异常对象, 
      host 参数是上下文对象
  */
  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;

    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let msg: unknown = 'Internal Server Error';
    // 是HttpException类型的异常
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') msg = res;
      else if (typeof res === 'object' && res && 'message' in res) {
        msg = res.message;
      }
    }

    const responseBody = {
      // headers: request.headers,
      url: request.url,
      query: request.query,
      body: request.body as Record<string, unknown>,
      params: request.params,
      timestamp: new Date().toISOString(),
      exceptioin:
        exception instanceof HttpException ? exception.name : 'UnknownError...',
      errorMessage: msg,
    };

    this.logger.error('[Ming Global Filter]', responseBody);
    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
