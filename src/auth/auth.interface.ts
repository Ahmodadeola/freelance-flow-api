import { Role } from 'generated/prisma/enums';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ReqUser {
  sub: string;
  email: string;
  role: Role;
}
