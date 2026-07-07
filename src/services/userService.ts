import db from '@/db/init';
import { generateSecureId } from '@/utils/crypto';
import { User } from '@/types';

export function createUser(
  robloxId: number,
  username: string,
  displayName: string,
  avatar?: string
): User {
  const id = generateSecureId();

  const stmt = db.prepare(`
    INSERT INTO users (id, robloxId, username, displayName, avatar)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, robloxId, username, displayName, avatar || null);

  return getUserById(id)!;
}

export function getUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id) as any;

  if (!user) return null;

  return formatUser(user);
}

export function getUserByRobloxId(robloxId: number): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE robloxId = ?');
  const user = stmt.get(robloxId) as any;

  if (!user) return null;

  return formatUser(user);
}

export function getUserByUsername(username: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username) as any;

  if (!user) return null;

  return formatUser(user);
}

export function updateUserLastLogin(userId: string): void {
  const stmt = db.prepare(`
    UPDATE users
    SET lastLogin = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(userId);
}

export function updateUserProfile(userId: string, updates: Partial<User>): void {
  const allowedFields = ['displayName', 'avatar', 'discordId'];
  const setClause = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (setClause.length === 0) return;

  values.push(userId);

  const stmt = db.prepare(`
    UPDATE users
    SET ${setClause.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);
}

export function banUser(userId: string): void {
  const stmt = db.prepare(`
    UPDATE users
    SET isBanned = 1
    WHERE id = ?
  `);

  stmt.run(userId);
}

export function unbanUser(userId: string): void {
  const stmt = db.prepare(`
    UPDATE users
    SET isBanned = 0
    WHERE id = ?
  `);

  stmt.run(userId);
}

export function isUserBanned(userId: string): boolean {
  const stmt = db.prepare('SELECT isBanned FROM users WHERE id = ?');
  const result = stmt.get(userId) as any;

  return result?.isBanned === 1;
}

export function isAdmin(userId: string): boolean {
  const stmt = db.prepare('SELECT isAdmin FROM users WHERE id = ?');
  const result = stmt.get(userId) as any;

  return result?.isAdmin === 1;
}

export function setAdmin(userId: string, isAdmin: boolean): void {
  const stmt = db.prepare(`
    UPDATE users
    SET isAdmin = ?
    WHERE id = ?
  `);

  stmt.run(isAdmin ? 1 : 0, userId);
}

export function getAllUsers(limit: number = 100, offset: number = 0): User[] {
  const stmt = db.prepare(`
    SELECT * FROM users
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `);

  const users = stmt.all(limit, offset) as any[];
  return users.map(formatUser);
}

export function searchUsers(query: string, limit: number = 20): User[] {
  const searchTerm = `%${query}%`;

  const stmt = db.prepare(`
    SELECT * FROM users
    WHERE username LIKE ? OR displayName LIKE ? OR robloxId = ?
    LIMIT ?
  `);

  const users = stmt.all(searchTerm, searchTerm, parseInt(query) || -1, limit) as any[];
  return users.map(formatUser);
}

export function getTotalUserCount(): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = stmt.get() as any;

  return result?.count || 0;
}

export function getNewUsersCount(hoursAgo: number = 24): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM users
    WHERE datetime(createdAt) > datetime('now', '-${hoursAgo} hours')
  `);

  const result = stmt.get() as any;
  return result?.count || 0;
}

export function getOnlineUsersCount(minutesAgo: number = 5): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM users
    WHERE datetime(lastLogin) > datetime('now', '-${minutesAgo} minutes')
  `);

  const result = stmt.get() as any;
  return result?.count || 0;
}

function formatUser(user: any): User {
  return {
    id: user.id,
    robloxId: user.robloxId,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    isAdmin: user.isAdmin === 1,
    isBanned: user.isBanned === 1,
    totalRewardsRedeemed: user.totalRewardsRedeemed || 0,
    totalPointsEarned: user.totalPointsEarned || 0,
  };
}
