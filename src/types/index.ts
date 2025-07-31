export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Beer {
  id: string;
  name: string;
  type: '캔' | '병' | '생맥주' | '기타';
  volume: number;
  alcohol_percentage: number;
  sort_order: number;
  user_id: string;
  created_at: string;
}

export interface ConsumptionRecord {
  id: string;
  date: string;
  beer_id: string;
  quantity: number;
  user_id: string;
  created_at: string;
  beer?: Beer;
}

export interface MonthlyStats {
  month: string;
  total_quantity: number;
  total_alcohol: number;
  days_consumed: number;
}