/*
  # 성능 최적화 인덱스 추가

  1. Indexes
    - Add index on beers table for user_id and sort_order
    - Add index on beers table for user_id for faster queries

  2. Notes
    - These indexes will improve query performance for beer management and consumption record queries
    - Especially important for mobile app responsiveness
*/

-- 맥주 테이블 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_beers_user_sort 
  ON beers(user_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_beers_user_id 
  ON beers(user_id);