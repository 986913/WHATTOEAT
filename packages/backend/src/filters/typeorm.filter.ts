// import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
// import { QueryFailedError, TypeORMError } from 'typeorm';

// @Catch(TypeORMError)
// export class TypeormFilter<T> implements ExceptionFilter {
//   catch(exception: TypeORMError, host: ArgumentsHost) {
//     console.log('expection is', exception);

//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse();
//     let code = 500;
//     if (exception instanceof QueryFailedError) {
//       code = exception.driverError.errno; // 1062 for dupciate entry of database error
//     }
//     response.status(500).json({
//       code,
//       timestamp: new Date().toISOString(),
//       message: `local filter message: ${exception.message}`,
//     });
//   }
// }
