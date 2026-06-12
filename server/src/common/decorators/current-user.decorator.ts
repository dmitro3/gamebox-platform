import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** 从请求中取出经 JWT 验证的当前用户，用法：@CurrentUser() user: JwtPayload */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
