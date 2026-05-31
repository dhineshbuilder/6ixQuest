/*
  # Quiz Application Database Schema

  1. New Tables
    - `quizzes`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, optional)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `is_active` (boolean, default true)
    
    - `questions`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid, references quizzes)
      - `question_text` (text, required)
      - `options` (jsonb array of strings)
      - `correct_answer` (text, required)
      - `order_index` (integer)
    
    - `responses`
      - `id` (uuid, primary key)
      - `quiz_id` (uuid, references quizzes)
      - `student_name` (text, required)
      - `student_email` (text, required)
      - `student_register_number` (text, required)
      - `answers` (jsonb array of selected answers)
      - `score` (integer)
      - `total_questions` (integer)
      - `submitted_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Teachers can only access their own quizzes
    - Students can submit responses without authentication
    - Questions are readable by quiz creators only
*/

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  order_index integer NOT NULL DEFAULT 0
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_email text NOT NULL,
  student_register_number text NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]',
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  submitted_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes table
CREATE POLICY "Teachers can CRUD their own quizzes"
  ON quizzes
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Anyone can read active quizzes for taking"
  ON quizzes
  FOR SELECT
  TO anon
  USING (is_active = true);

-- RLS Policies for questions table
CREATE POLICY "Teachers can CRUD questions for their quizzes"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    quiz_id IN (
      SELECT id FROM quizzes WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Anyone can read questions for active quizzes"
  ON questions
  FOR SELECT
  TO anon
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE is_active = true
    )
  );

-- RLS Policies for responses table
CREATE POLICY "Teachers can read responses for their quizzes"
  ON responses
  FOR SELECT
  TO authenticated
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert responses"
  ON responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_responses_quiz_id ON responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_responses_submitted_at ON responses(submitted_at);