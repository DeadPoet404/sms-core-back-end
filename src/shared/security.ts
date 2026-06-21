import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}.${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, originalHash] = storedHash.split('.');
  if (!salt || !originalHash) return false;

  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');

  if (keyBuffer.length !== originalBuffer.length) return false;
  return timingSafeEqual(keyBuffer, originalBuffer);
}

export function generateToken(payload: Record<string, any>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const stringifiedPayload = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 3600000 })).toString('base64url');
  
  const { createHmac } = require('node:crypto');
  const hmac = createHmac('sha256', secret);
  hmac.update(`${header}.${stringifiedPayload}`);
  const signature = hmac.digest('base64url');

  return `${header}.${stringifiedPayload}.${signature}`;
}

export function verifyToken(token: string, secret: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const { createHmac } = require('node:crypto');
  const hmac = createHmac('sha256', secret);
  hmac.update(`${header}.${payload}`);
  const expectedSignature = hmac.digest('base64url');

  if (signature !== expectedSignature) return null;

  const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (Date.now() > decodedPayload.exp) return null;

  return decodedPayload;
}
