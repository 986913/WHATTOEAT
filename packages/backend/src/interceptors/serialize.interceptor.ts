// import {
//   CallHandler,
//   ExecutionContext,
//   Injectable,
//   NestInterceptor,
// } from '@nestjs/common';
// import { Observable, map } from 'rxjs';
// import { plainToInstance } from 'class-transformer';

/**
 * SerializeInterceptor (Post-Controller Interceptor)
 *
 * Current status:
 * - Not registered globally
 * - Not used via @UseInterceptors()
 * - No DTO metadata wiring
 * - No Reflector integration
 *
 * Therefore:
 * This interceptor is currently dormant and has no runtime effect.
 *
 * Intended design goal:
 * - Transform controller return values into DTO instances
 * - Strip non-exposed properties via class-transformer
 * - Enforce response-level data shaping
 *
 * Why it is incomplete:
 * - DTO is passed via constructor instead of metadata
 * - Not suitable for global usage in current form
 * - No per-route DTO binding mechanism
 *
 * Architectural limitation:
 * A serialization interceptor cannot be globally effective
 * unless it dynamically resolves DTO type per handler
 * using Reflector + custom decorator.
 *
 * If activated without proper DTO binding,
 * it risks applying incorrect transformations
 * or silently returning unmodified data.
 *
 * This file currently serves as:
 * - A reference implementation draft
 * - A placeholder for future response serialization strategy
 *
 * Recommended next steps:
 * 1. Replace constructor DTO injection with metadata-based DTO resolution.
 * 2. Introduce @Serialize(DTO) decorator.
 * 3. Register as global interceptor via DI container.
 * 4. Support array and paginated responses safely.
 */

// @Injectable()
// export class SerializeInterceptor<T> implements NestInterceptor<T, T> {
//   constructor(private dto: any) {}
//   intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
//     // const req = context.switchToHttp().getRequest<Request>();

//     return next.handle().pipe(
//       map((data: T) => {
//         // console.log('这是在拦截器执行之后 data is', data);
//         // return data;
//         return plainToInstance(this.dto, data, {
//           //设置为true之后，所有经过该interceptor的接口都需要设置 @Expose 或 @Exclude
//           excludeExtraneousValues: true,
//         });
//       }),
//     );
//   }
// }
