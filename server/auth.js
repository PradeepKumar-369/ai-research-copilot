import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import express from 'express';
import * as store from './store.js';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_salt, password_hash, ...rest } = user;
  return rest;
}

export function getUserByToken(token) {
  if (!token) return null;
  const session = store.list('session').find(s => s.token === token);
  if (!session) return null;
  return store.get('user', session.user_id);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = store.list('user').find(u => u.email === normalizedEmail);
  const { salt, hash } = hashPassword(password);
  if (existing) {
    if (existing.verified) return res.status(409).json({ error: 'An account with this email already exists' });
    store.update('user', existing.id, { password_salt: salt, password_hash: hash });
  } else {
    const isFirstUser = store.list('user').length === 0;
    store.create('user', {
      email: normalizedEmail,
      password_salt: salt,
      password_hash: hash,
      role: isFirstUser ? 'admin' : 'user',
      verified: false,
    });
  }
  console.log(`[auth] Registration code for ${normalizedEmail}: any 6-digit code works in local dev.`);
  res.json({ ok: true });
});

router.post('/verify-otp', (req, res) => {
  const { email, otpCode } = req.body || {};
  if (!email || !otpCode) return res.status(400).json({ error: 'Email and code are required' });
  if (String(otpCode).trim().length < 6) return res.status(400).json({ error: 'Invalid verification code' });
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = store.list('user').find(u => u.email === normalizedEmail);
  if (!user) return res.status(404).json({ error: 'No pending registration for this email' });
  const verified = store.update('user', user.id, { verified: true });
  const token = randomUUID();
  store.create('session', { token, user_id: verified.id });
  res.json({ access_token: token });
});

router.post('/resend-otp', (req, res) => {
  const { email } = req.body || {};
  console.log(`[auth] Resend requested for ${email}: any 6-digit code works in local dev.`);
  res.json({ ok: true });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = store.list('user').find(u => u.email === normalizedEmail);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = randomUUID();
  store.create('session', { token, user_id: user.id });
  res.json({ access_token: token });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(sanitizeUser(req.user));
});

router.post('/logout', requireAuth, (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = store.list('session').find(s => s.token === token);
  if (session) store.remove('session', session.id);
  res.json({ ok: true });
});

router.post('/reset-password-request', (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = store.list('user').find(u => u.email === normalizedEmail);
  if (user) {
    const token = randomUUID();
    store.create('passwordreset', { token, user_id: user.id });
    console.log(`[auth] Password reset link for ${normalizedEmail}: http://localhost:5174/reset-password?token=${token}`);
  }
  res.json({ ok: true });
});

router.post('/reset-password', (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  if (!resetToken || !newPassword) return res.status(400).json({ error: 'Missing reset token or new password' });
  const reset = store.list('passwordreset').find(r => r.token === resetToken);
  if (!reset) return res.status(400).json({ error: 'Invalid or expired reset token' });
  const { salt, hash } = hashPassword(newPassword);
  store.update('user', reset.user_id, { password_salt: salt, password_hash: hash });
  store.remove('passwordreset', reset.id);
  res.json({ ok: true });
});

export default router;
