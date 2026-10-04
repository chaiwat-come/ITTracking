import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

// The secret must come from the environment - never fall back to a hardcoded value
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set (run scripts/init-env.sh or copy env.example to .env)');
  }
  return secret;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { algorithm: 'HS256', expiresIn: '24h' });
};

export const verifyToken = (token: string): JWTPayload | null => {
  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return decoded as JWTPayload;
  } catch {
    return null;
  }
};

export function extractTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function getUserFromRequest(req: NextRequest): JWTPayload | null {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}
