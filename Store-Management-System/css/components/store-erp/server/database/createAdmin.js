// ============================================================
// Creates (or resets) the initial Admin user.
// Run: npm run create-admin
// Prompts for email + password on the terminal so no password
// hash ever needs to be hardcoded in source control.
// ============================================================
require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => { rl.close(); resolve(answer); });
      return;
    }
    // Mask password input
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (char) => {
      char = char.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(value);
      } else if (char === '\u0003') {
        process.exit(1);
      } else if (char === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('=== Create / Reset Admin User ===');
  const fullName = (await ask('Full name [System Administrator]: ')) || 'System Administrator';
  const email = (await ask('Email [admin@store-erp.local]: ')) || 'admin@store-erp.local';
  const password = await ask('Password (min 8 chars): ', true);

  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [roles] = await pool.execute("SELECT id FROM roles WHERE name = 'Admin' LIMIT 1");
  if (!roles.length) {
    console.error('Admin role not found. Run schema.sql and seed.sql first.');
    process.exit(1);
  }
  const roleId = roles[0].id;

  const [branches] = await pool.execute('SELECT id FROM branches WHERE is_main = TRUE LIMIT 1');
  const branchId = branches.length ? branches[0].id : null;

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);

  if (existing.length) {
    await pool.execute(
      'UPDATE users SET password_hash = ?, full_name = ?, role_id = ?, is_active = TRUE WHERE email = ?',
      [passwordHash, fullName, roleId, email]
    );
    console.log(`Existing user ${email} updated with new password and Admin role.`);
  } else {
    await pool.execute(
      `INSERT INTO users (employee_code, full_name, email, password_hash, role_id, branch_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      ['EMP-0001', fullName, email, passwordHash, roleId, branchId]
    );
    console.log(`Admin user ${email} created successfully.`);
  }

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create admin user:', err);
  process.exit(1);
});
