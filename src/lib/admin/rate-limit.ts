/**
 * In-memory rate limiting and account lockout for Admin login attempts.
 * Rules:
 * - 5 failed attempts locks out for 15 minutes (900 seconds)
 * - Tracked by email and client IP
 */

interface AttemptRecord {
  failures: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

const loginAttempts = new Map<string, AttemptRecord>();

// Cleanup stale records periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of loginAttempts.entries()) {
      if (now - record.lastAttemptAt > 60 * 60 * 1000) {
        loginAttempts.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockoutRemainingSec?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: 5 };
  }

  // Check if currently locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    const lockoutRemainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutRemainingSec,
    };
  }

  // If lockout expired, reset
  if (record.lockedUntil && now >= record.lockedUntil) {
    loginAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: 5 };
  }

  return {
    allowed: record.failures < 5,
    remainingAttempts: Math.max(0, 5 - record.failures),
  };
}

export function recordLoginFailure(identifier: string): {
  locked: boolean;
  lockoutRemainingSec?: number;
  remainingAttempts: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(identifier) || {
    failures: 0,
    lockedUntil: null,
    lastAttemptAt: now,
  };

  record.failures += 1;
  record.lastAttemptAt = now;

  if (record.failures >= 5) {
    // Lock for 15 minutes
    record.lockedUntil = now + 15 * 60 * 1000;
    loginAttempts.set(identifier, record);
    return {
      locked: true,
      lockoutRemainingSec: 15 * 60,
      remainingAttempts: 0,
    };
  }

  loginAttempts.set(identifier, record);
  return {
    locked: false,
    remainingAttempts: 5 - record.failures,
  };
}

export function recordLoginSuccess(identifier: string) {
  loginAttempts.delete(identifier);
}
