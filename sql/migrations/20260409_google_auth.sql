-- Add Google sign-in support to users
ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN google_sub VARCHAR(255) NULL AFTER password_hash,
  ADD UNIQUE KEY uniq_users_google_sub (google_sub);
