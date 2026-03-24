import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { signToken } from '../middleware/auth';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

const ADJECTIVES = ['Swift', 'Clever', 'Bold', 'Silent', 'Wild', 'Fierce', 'Lucky', 'Crafty'];
const NOUNS = ['Tiger', 'Eagle', 'Fox', 'Wolf', 'Hawk', 'Bear', 'Lion', 'Shark'];

function generateGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  return `${adj}${noun}${num}`;
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        displayName: displayName?.trim() || username,
        password: hashed,
        stats: { create: {} },
      },
    });

    const token = signToken({ userId: user.id, username: user.username, displayName: user.displayName });
    res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ userId: user.id, username: user.username, displayName: user.displayName });
    res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/guest — create temporary guest account
router.post('/guest', async (req, res) => {
  const { displayName } = req.body;
  try {
    const guestId = uuidv4().slice(0, 8);
    const username = `guest_${guestId}`;
    const name = displayName?.trim() || generateGuestName();
    const hashed = await bcrypt.hash(uuidv4(), 10); // random password

    const user = await prisma.user.create({
      data: {
        username,
        displayName: name,
        password: hashed,
        isAnonymous: true,
        stats: { create: {} },
      },
    });

    const token = signToken({ userId: user.id, username: user.username, displayName: user.displayName });
    res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, isGuest: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { stats: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      stats: user.stats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /auth/profile — update display name
router.patch('/profile', authMiddleware, async (req: AuthRequest, res) => {
  const { displayName } = req.body;
  if (!displayName?.trim()) return res.status(400).json({ error: 'Display name required' });
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { displayName: displayName.trim() },
    });
    const token = signToken({ userId: user.id, username: user.username, displayName: user.displayName });
    res.json({ token, displayName: user.displayName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
