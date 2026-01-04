import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.apiResponse(data)));
  }

  apiResponse(data: Record<string, any>) {
    if (data.hasOwnProperty('message') && Object.keys(data).length == 1)
      return data;
    else if (data && !!data.records && !!data.page)
      return {
        data: data.records,
        meta: {
          page: data.page,
          limit: data.limit,
          totalPages: Math.ceil(data.total / data.limit),
          total: data.total,
        },
      };

    return { data };
  }
}
