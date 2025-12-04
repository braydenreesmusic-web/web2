-- Quick verification: Check if partner_requests table exists and has data

-- 1. Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'partner_requests'
);

-- 2. Check the structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'partner_requests'
ORDER BY ordinal_position;

-- 3. View all partner requests
SELECT 
  id,
  from_email,
  from_name,
  to_email,
  status,
  created_at
FROM partner_requests
ORDER BY created_at DESC;

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'partner_requests';

-- If you see no results for the table, run fix-simple-partner-linking.sql first!
