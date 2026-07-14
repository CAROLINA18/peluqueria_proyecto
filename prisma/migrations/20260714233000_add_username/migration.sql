ALTER TABLE `users`
  ADD COLUMN `username` VARCHAR(80) NULL,
  ADD COLUMN `normalized_username` VARCHAR(80) NULL;

UPDATE `users`
SET
  `username` = CASE
    WHEN `normalized_email` = 'admin@linaquirama.local' THEN 'admin'
    ELSE CONCAT('user_', LEFT(REPLACE(`id`, '-', ''), 8))
  END,
  `normalized_username` = CASE
    WHEN `normalized_email` = 'admin@linaquirama.local' THEN 'admin'
    ELSE CONCAT('user_', LEFT(REPLACE(`id`, '-', ''), 8))
  END;

ALTER TABLE `users`
  MODIFY `username` VARCHAR(80) NOT NULL,
  MODIFY `normalized_username` VARCHAR(80) NOT NULL,
  ADD UNIQUE INDEX `users_normalized_username_key` (`normalized_username`);
