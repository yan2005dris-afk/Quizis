export type DecodedJwt = {
  iat?: number;
  exp?: number;
};

export type SessionBase = {
  usersId: number;
  sessionsId: string;
  email?: string;
  createdAt?: number;
  expiresAt?: number;
};
