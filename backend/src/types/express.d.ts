import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role?: 'admin' | 'user';
      };
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: number;
      };
    }
  }
}

export interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    role: 'admin' | 'user';
  };
}
