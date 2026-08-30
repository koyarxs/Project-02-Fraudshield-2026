import type { Request } from 'express';
import type { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  name?: string;
  role: UserRole;
  active: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
