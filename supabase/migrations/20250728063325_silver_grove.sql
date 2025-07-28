/*
  # 맥주 테이블 생성

  1. New Tables
    - `beers`
      - `id` (uuid, primary key)
      - `name` (text, 맥주 이름)
      - `volume` (decimal, 용량 ml)
      - `alcohol_percentage` (decimal, 알코올 도수 %)
      - `sort_order` (integer, 정렬 순서)
      - `user_id` (uuid, 사용자 ID)
      - `created_at` (timestamp, 생성일시)

  2. Security
    - Enable RLS on `beers` table
    - Add policy for authenticated users to manage their own beers
*/

CREATE TABLE IF NOT EXISTS beers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  volume decimal NOT NULL,
  alcohol_percentage decimal NOT NULL,
  sort_order integer DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE beers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own beers"
  ON beers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);