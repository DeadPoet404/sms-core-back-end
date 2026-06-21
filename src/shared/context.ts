import { verifyToken } from './security';

export interface RequestContext {
  tenantId: string;
  userId: string;
  role: string;
}

export class SecurityContextError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'SecurityContextError';
  }
}

export function authenticateRequest(
  authHeader: string | undefined,
  secret: string
): RequestContext {
  if (!authHeader) {
    throw new SecurityContextError(401, 'Authorization header missing. Request rejected by fail-closed guardrail.');
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new SecurityContextError(401, 'Malformed authorization header format. Expected "Bearer <token>".');
  }

  const decoded = verifyToken(token, secret);
  if (!decoded) {
    throw new SecurityContextError(401, 'Invalid or expired security token. Tenant context could not be verified.');
  }

  if (!decoded.tenantId || !decoded.userId || !decoded.role) {
    throw new SecurityContextError(403, 'Token parsing validation failure: Missing vital tenant isolation parameters.');
  }

  return {
    tenantId: decoded.tenantId,
    userId: decoded.userId,
    role: decoded.role
  };
}
