import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { User } from '../models';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'user';
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
  };
}

export const authenticate: RequestHandler = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.error('❌ [Auth] Nenhum token fornecido');
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    logger.info(`📝 [Auth] Token recebido, comprimento: ${token.length}`);

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as any;
      logger.info(`✅ [Auth] Token validado com sucesso, userId: ${decoded.userId}, expiresIn: ${config.jwt.expiresIn}`);
    } catch (jwtError: any) {
      logger.error(`❌ [Auth JWT] ${jwtError.name}: ${jwtError.message}`);
      logger.error(`❌ [Auth JWT Details] Secret used length: ${config.jwt.secret.length}, Token decode attempt failed`);
      throw jwtError;
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      logger.error(`❌ [Auth] Usuário com ID ${decoded.userId} não encontrado`);
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }
    
    if (!user.isActive) {
      logger.error(`❌ [Auth] Usuário ${user.email} inativo`);
      res.status(401).json({ error: 'Usuário inativo' });
      return;
    }

    logger.info(`✅ [Auth] ${user.email} autenticado (ID: ${user.id})`);

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    };

    next();
  } catch (error: any) {
    logger.error(`❌ [Auth] Erro: ${error.message}`);
    logger.error(`❌ [Auth] Error type: ${error.name}, stack: ${error.stack?.split('\n')[0]}`);
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    return;
  }
  next();
};
