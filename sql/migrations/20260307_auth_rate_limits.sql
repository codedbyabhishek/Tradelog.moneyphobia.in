-- Add auth_rate_limits table for login/signup rate limiting
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key_name VARCHAR(191) NOT NULL,
  requests INT UNSIGNED NOT NULL DEFAULT 0,
  window_started_at DATETIME NOT NULL,
  blocked_until DATETIME NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (key_name),
  KEY idx_auth_rate_limits_updated_at (updated_at),
  KEY idx_auth_rate_limits_blocked_until (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
