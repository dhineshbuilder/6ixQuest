/*
  # Fix Quiz Submission Error

  1. Security Updates
    - Ensure anonymous users can insert responses
    - Verify RLS policies are correctly configured
    - Add missing users table if needed

  2. Changes
    - Create users table if it doesn't exist
    - Update RLS policies for responses table
    - Ensure proper foreign key relationships
*/

-- Create users table if it doesn't exist (for foreign key reference)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update the responses table RLS policies
DROP POLICY IF EXISTS "Anyone can insert responses" ON responses;
DROP POLICY IF EXISTS "Teachers can read responses for their quizzes" ON responses;

-- Allow anonymous users to insert responses
CREATE POLICY "Anyone can insert responses"
  ON responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow teachers to read responses for their quizzes
CREATE POLICY "Teachers can read responses for their quizzes"
  ON responses
  FOR SELECT
  TO authenticated
  USING (quiz_id IN (
    SELECT id FROM quizzes WHERE created_by = auth.uid()
  ));

-- Ensure the foreign key constraint exists but doesn't block anonymous submissions
DO $$
BEGIN
  -- Drop the existing foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quizzes_created_by_fkey' 
    AND table_name = 'quizzes'
  ) THEN
    ALTER TABLE quizzes DROP CONSTRAINT quizzes_created_by_fkey;
  END IF;
  
  -- Add the foreign key constraint back with proper handling
  ALTER TABLE quizzes ADD CONSTRAINT quizzes_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;