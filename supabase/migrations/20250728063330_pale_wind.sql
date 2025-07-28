/*
  # 소비 기록 테이블 생성

  1. New Tables
    - `consumption_records`
      - `id` (uuid, primary key)
      - `date` (date, 소비 날짜)
      - `beer_id` (uuid, 맥주 ID)
      - `quantity` (decimal, 소비량)
      - `user_id` (uuid, 사용자 ID)
      - `created_at` (timestamp, 생성일시)

  2. Security
    - Enable RLS on `consumption_records` table
    - Add policy for authenticated users to manage their own consumption records

  3. Indexes
    - Add index on user_id and date for better query performance
*/

CREATE TABLE IF NOT EXISTS consumption_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  beer_id uuid REFERENCES beers(id) ON DELETE CASCADE,
  quantity decimal NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own consumption records"
  ON consumption_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_consumption_records_user_date 
  ON consumption_records(user_id, date);

CREATE INDEX IF NOT EXISTS idx_consumption_records_beer_id 
  ON consumption_records(beer_id);