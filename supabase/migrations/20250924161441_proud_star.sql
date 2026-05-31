/*
  # Add phone number field to responses table

  1. Changes
    - Add `student_phone` column to `responses` table
    - Column is required (NOT NULL) for new responses
    - Add default empty string for existing records

  2. Security
    - No changes to RLS policies needed
*/

-- Add phone number column to responses table
ALTER TABLE responses 
ADD COLUMN student_phone text NOT NULL DEFAULT '';

-- Remove default after adding the column
ALTER TABLE responses 
ALTER COLUMN student_phone DROP DEFAULT;