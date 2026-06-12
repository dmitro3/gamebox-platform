import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/** 统一失败响应信封：{ code, data:null, message } */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      message = typeof r === 'string' ? r : ((r as { message?: string }).message ?? message);
    }

    // 业务错误码 = HTTP 状态码 * 100（简单约定，可按 docs/02 错误码段位细化）
    res.status(status).json({ code: status * 100, data: null, message });
  }
}
