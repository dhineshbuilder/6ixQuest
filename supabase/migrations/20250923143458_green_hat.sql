/*
  # Add time-based validity to quizzes

  1. New Columns
    - `valid_from` (timestamptz, nullable) - Quiz becomes accessible from this time
    - `valid_until` (timestamptz, nullable) - Quiz becomes inaccessible after this time
  
  2. Changes
    - Add time validity columns to quizzes table
    - Update RLS policies to check time validity for anonymous users
  
  3. Notes
    - If both dates are null, quiz is always accessible (current behavior)
    - If only valid_from is set, quiz is accessible from that time onwards
    - If only valid_until is set, quiz is accessible until that time
    - If both are set, quiz is only accessible within that time window
*/

-- Add time validity columns to quizzes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'valid_from'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN valid_from timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'valid_until'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN valid_until timestamptz;
  END IF;
END $$;

-- Update RLS policy for anonymous users to check time validity
DROP POLICY IF EXISTS "Anyone can read active quizzes for taking" ON quizzes;

CREATE POLICY "Anyone can read active quizzes for taking"
  ON quizzes
  FOR SELECT
  TO anon
  USING (
    is_active = true 
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
  );

-- Update RLS policy for questions to match quiz time validity
DROP POLICY IF EXISTS "Anyone can read questions for active quizzes" ON questions;

CREATE POLICY "Anyone can read questions for active quizzes"
  ON questions
  FOR SELECT
  TO anon
  USING (
    quiz_id IN (
      SELECT id FROM quizzes 
      WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= now())
        AND (valid_until IS NULL OR valid_until >= now())
    )
  );