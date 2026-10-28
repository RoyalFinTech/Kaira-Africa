-- Task notifications are stored alongside existing notification types.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task';
