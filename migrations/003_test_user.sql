-- ============================================
-- ClipKing Database - Test User
-- Version: 1.0
-- Date: 2026-01-27
-- ============================================

-- ============================================
-- Create a test user for development
-- ============================================

-- Test user with a fixed UUID (for easy reference)
INSERT INTO users (id, email, name, auth_provider, plan) VALUES
  ('11111111-1111-1111-1111-111111111111', 'test@clipking.dev', 'Test User', 'development', 'free')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name;

-- Give the test user 100 credits
INSERT INTO credits (user_id, credits_left) VALUES
  ('11111111-1111-1111-1111-111111111111', 100)
ON CONFLICT (user_id) DO UPDATE SET
  credits_left = 100,
  last_updated = NOW();

-- ============================================
-- Optional: Create a premium test user
-- ============================================
INSERT INTO users (id, email, name, auth_provider, plan) VALUES
  ('22222222-2222-2222-2222-222222222222', 'premium@clipking.dev', 'Premium Test User', 'development', 'premium')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  plan = EXCLUDED.plan;

-- Premium user gets 500 credits
INSERT INTO credits (user_id, credits_left) VALUES
  ('22222222-2222-2222-2222-222222222222', 500)
ON CONFLICT (user_id) DO UPDATE SET
  credits_left = 500,
  last_updated = NOW();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Test users created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Free User:';
  RAISE NOTICE '  ID: 11111111-1111-1111-1111-111111111111';
  RAISE NOTICE '  Email: test@clipking.dev';
  RAISE NOTICE '  Credits: 100';
  RAISE NOTICE '';
  RAISE NOTICE 'Premium User:';
  RAISE NOTICE '  ID: 22222222-2222-2222-2222-222222222222';
  RAISE NOTICE '  Email: premium@clipking.dev';
  RAISE NOTICE '  Credits: 500';
END $$;
