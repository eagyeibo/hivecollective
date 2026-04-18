//cd "C:\Users\eagye\OneDrive\Desktop\my-platform\backend"
//node "password reset".js
// This script resets the password for a user in the database.

const pool = require('./db');
const bcrypt = require('bcrypt');

const USERNAME = 'eagyeibo';
const NEW_PASSWORD = 'Quincy123!';

bcrypt.hash(NEW_PASSWORD, 12).then(hash => {
  pool.query(
    'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username',
    [hash, USERNAME]
  ).then(r => {
    console.log('Password reset for:', r.rows[0].username);
    pool.end();
  });
});