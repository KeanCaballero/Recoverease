import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    unauthorized(res, 'No token provided');
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    unauthorized(res, 'Invalid or expired token');
  }
}

export function requireRole(...roles: Array<'doctor' | 'patient' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorized(res);
      return;
    }
    if (!roles.includes(req.user.role)) {
      forbidden(res, `Access restricted to: ${roles.join(', ')}`);
      return;
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole('admin')(req, res, next);
}

export function requireDoctor(req: Request, res: Response, next: NextFunction): void {
  requireRole('doctor')(req, res, next);
}

export function requirePatient(req: Request, res: Response, next: NextFunction): void {
  requireRole('patient')(req, res, next);
}

export function requireDoctorOrAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole('doctor', 'admin')(req, res, next);
}
