-- Multi-account broker journal support.
-- Run this migration once after the earlier schema migrations.
-- It creates a per-user "Legacy journal" account and safely assigns all
-- existing trades to it before making account ownership required.

CREATE TABLE IF NOT EXISTS broker_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  account_id VARCHAR(64) NOT NULL,
  broker_id VARCHAR(32) NOT NULL,
  account_name VARCHAR(80) NOT NULL,
  account_reference_encrypted LONGTEXT NULL,
  account_number_last4 VARCHAR(4) NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_broker_accounts_user_account (user_id, account_id),
  KEY idx_broker_accounts_user_default (user_id, is_default),
  CONSTRAINT fk_broker_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE trades
  ADD COLUMN account_id VARCHAR(64) NULL AFTER user_id;

INSERT INTO broker_accounts
  (user_id, account_id, broker_id, account_name, account_reference_encrypted, account_number_last4, currency, is_default, created_at, updated_at)
SELECT id, CONCAT('legacy-', id), 'manual', 'Legacy journal', NULL, NULL, 'INR', 1, NOW(), NOW()
FROM users
ON DUPLICATE KEY UPDATE account_id = VALUES(account_id);

UPDATE trades
SET account_id = CONCAT('legacy-', user_id)
WHERE account_id IS NULL;

ALTER TABLE trades
  MODIFY COLUMN account_id VARCHAR(64) NOT NULL,
  DROP INDEX uniq_user_trade,
  ADD UNIQUE KEY uniq_user_account_trade (user_id, account_id, trade_id),
  ADD KEY idx_trades_user_account_date (user_id, account_id, trade_date);
