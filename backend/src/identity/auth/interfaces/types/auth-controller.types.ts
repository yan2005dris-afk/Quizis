import type { Response } from 'express';
import type { RequestWithCookies } from './JwtRequest.types';

export type RefreshAuthUser = {
  sessionsId: string;
  usersId?: number;
  sub: number;
};

export type LoginRequest = RequestWithCookies & {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

export type RefreshRequest = RequestWithCookies & {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  user: RefreshAuthUser;
};

export type CookieResponse = Pick<
  Response,
  'cookie' | 'clearCookie' | 'json' | 'status'
>;
