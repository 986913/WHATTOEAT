import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SerializeInterceptor<T> implements NestInterceptor<T, T> {
  constructor(private dto: any) {}
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    // const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data: T) => {
        // console.log('这是在拦截器执行之后 data is', data);
        // return data;
        return plainToInstance(this.dto, data, {
          //设置为true之后，所有经过该interceptor的接口都需要设置 @Expose 或 @Exclude
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
