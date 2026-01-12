-- Create mindmaps table
USE studybloom;

CREATE TABLE IF NOT EXISTS mindmaps (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    summary_id INT,
    title VARCHAR(255) NOT NULL,
    mindmap_data JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_user_id_mindmaps ON mindmaps(user_id);
CREATE INDEX idx_summary_id ON mindmaps(summary_id);
CREATE INDEX idx_created_at_mindmaps ON mindmaps(created_at);