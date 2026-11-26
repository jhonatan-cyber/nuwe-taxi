import { Request } from 'express';
import { JwtRole } from './jwt-role';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    username: string;
    roles: JwtRole[];
  };
}