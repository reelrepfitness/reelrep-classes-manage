-- Migration: Add expo_push_token to profiles
-- Purpose: Store Expo push notification tokens for users

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Add comment
COMMENT ON COLUMN profiles.expo_push_token IS 'Expo push notification token for sending push notifications';
