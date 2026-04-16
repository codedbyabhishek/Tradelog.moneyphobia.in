CREATE TABLE IF NOT EXISTS learning_videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  video_id VARCHAR(64) NOT NULL,
  video_json LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_user_learning_video (user_id, video_id),
  KEY idx_learning_videos_user (user_id),
  CONSTRAINT fk_learning_videos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
