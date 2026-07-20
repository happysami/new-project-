const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('../middleware/auditLogger');

function signAccessToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function signRefreshToken(user) {
  return jwt.sign({ userId: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('Email and password are required.', 400);
    }

    const users = await query(
      `SELECT u.*, r.name AS role_name FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );

    // Use a generic message for both "no such user" and "wrong password"
    // so we never reveal which emails are registered.
    const genericError = 'Invalid email or password.';
    if (!users.length) throw new AppError(genericError, 401);

    const user = users[0];
    if (!user.is_active) throw new AppError('This account has been deactivated. Contact your administrator.', 403);

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      await recordAudit({ req, action: 'login', module: 'auth', entityId: user.id, description: `Failed login attempt for ${email}` });
      throw new AppError(genericError, 401);
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.user = { id: user.id };
    await recordAudit({ req, action: 'login', module: 'auth', entityId: user.id, description: `${user.full_name} logged in` });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role_name,
          branchId: user.branch_id,
          photoUrl: user.photo_url,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh - issue a new access token from the httpOnly refresh cookie
async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw new AppError('No refresh token provided.', 401);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError('Refresh token invalid or expired. Please log in again.', 401);
    }

    const users = await query('SELECT id, is_active FROM users WHERE id = ? LIMIT 1', [payload.userId]);
    if (!users.length || !users[0].is_active) throw new AppError('Account not found or deactivated.', 401);

    const accessToken = signAccessToken(users[0]);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    res.clearCookie('refreshToken');
    if (req.user) {
      await recordAudit({ req, action: 'logout', module: 'auth', entityId: req.user.id, description: `${req.user.fullName} logged out` });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ success: true, data: req.user });
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required.', 400);

    const users = await query('SELECT id, full_name FROM users WHERE email = ? LIMIT 1', [email]);

    // Always respond with the same message whether or not the email exists,
    // to avoid leaking which addresses are registered.
    const genericMessage = 'If an account exists for that email, a reset link has been sent.';

    if (users.length) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresMinutes = Number(process.env.RESET_TOKEN_EXPIRES_MIN) || 30;
      const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

      await query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [
        hashedToken,
        expiresAt,
        users[0].id,
      ]);

      // NOTE: Wire up an actual email/SMS provider here (e.g. Nodemailer, SendGrid,
      // or an SMS gateway for Telebirr-region users). For now the raw token is
      // returned only when running in development, to allow local testing of the
      // full reset flow without a mail server configured.
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ success: true, message: genericMessage, devResetToken: rawToken });
      }
    }

    res.json({ success: true, message: genericMessage });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) throw new AppError('Token and new password are required.', 400);
    if (newPassword.length < 8) throw new AppError('Password must be at least 8 characters.', 400);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const users = await query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1',
      [hashedToken]
    );

    if (!users.length) throw new AppError('This reset link is invalid or has expired.', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [
      passwordHash,
      users[0].id,
    ]);

    res.json({ success: true, message: 'Password has been reset. You can now log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/change-password (for a logged-in user changing their own password)
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Current and new password are required.', 400);
    if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters.', 400);

    const users = await query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const matches = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!matches) throw new AppError('Current password is incorrect.', 401);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, logout, me, forgotPassword, resetPassword, changePassword };
