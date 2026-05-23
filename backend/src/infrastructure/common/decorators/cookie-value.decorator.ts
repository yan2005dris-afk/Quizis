import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const CookieValue = createParamDecorator(
  (cookieName: string, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const cookies = request.cookies as unknown;

    if (!cookies || typeof cookies !== 'object') {
      return undefined;
    }

    return (cookies as Record<string, unknown>)[cookieName];
  },
);
