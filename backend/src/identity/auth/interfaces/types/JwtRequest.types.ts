import type { Request } from 'express';

export type JwtAccessPayload = {
  sub: number;
  sid: string;
  email?: string;
};

export type JwtRefreshPayload = {
  sub: number;
  sid: string;
  email?: string;
};

export type RequestWithCookies = Request & {
  cookies?: Record<string, unknown>;
};

export type JwtRequest = Request & {
  user: {
    sub: number;
  };
};
