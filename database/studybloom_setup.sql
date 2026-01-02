-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS studybloom;

-- Use the database
USE studybloom;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY email (email)
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    date DATETIME NOT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_user_id ON reminders(user_id);
CREATE INDEX idx_date ON reminders(date);
CREATE INDEX idx_email_sent ON reminders(email_sent);

-- Create summaries table
CREATE TABLE IF NOT EXISTS summaries (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    original_content_preview TEXT,
    summary_text TEXT NOT NULL,
    file_path VARCHAR(500),
    status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for the summaries table
CREATE INDEX idx_user_id_summaries ON summaries(user_id);
CREATE INDEX idx_created_at ON summaries(created_at);
CREATE INDEX idx_status ON summaries(status);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create collection_items table to link summaries to collections
CREATE TABLE IF NOT EXISTS collection_items (
    id INT NOT NULL AUTO_INCREMENT,
    collection_id INT NOT NULL,
    summary_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE,
    UNIQUE KEY unique_collection_summary (collection_id, summary_id)
);

-- Create indexes for collections and collection_items tables
CREATE INDEX idx_user_id_collections ON collections(user_id);
CREATE INDEX idx_collection_id ON collection_items(collection_id);
CREATE INDEX idx_summary_id ON collection_items(summary_id);

-- Create password_resets table for OTP-based password reset
CREATE TABLE IF NOT EXISTS password_resets (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for password_resets
CREATE INDEX idx_email_otp ON password_resets(email, otp);
CREATE INDEX idx_expires_at ON password_resets(expires_at);