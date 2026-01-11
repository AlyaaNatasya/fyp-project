-- Migration script to add theme_color and background_color fields to existing users table
-- Run this script if your database already exists and you need to add the new theme_color and background_color fields

USE studybloom;

-- Add theme_color column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(20) DEFAULT '#c1946e' AFTER password;

-- Add background_color column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) DEFAULT '#fee3c3' AFTER theme_color;

-- Create email_updates table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_updates (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    current_email VARCHAR(100) NOT NULL,
    new_email VARCHAR(100) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for email_updates table
CREATE INDEX IF NOT EXISTS idx_user_id_email_updates ON email_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_expires_at_email_updates ON email_updates(expires_at);

-- Verify the columns were added
DESCRIBE users;