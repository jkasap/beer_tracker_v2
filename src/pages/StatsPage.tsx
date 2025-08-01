import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trophy, GlassWater, TrendingUp, CalendarDays, Percent, Sigma, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ConsumptionRecord, Beer } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  getYear,
  startOfYear,
  endOfYear,
  getDay
} from 'date-fns';
import { ko } from 'date-fns/locale';

interface MonthlyStats {
  totalQuantity: number;
  totalVolume: number;
  totalAlcohol: number;
  drinkingDays: number;
  maxInDay: number;
  avgPerDay: number;
  beerRanking: { beer: Beer; quantity: number; volume: number }[];
}

const StatsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<(ConsumptionRecord & { beer: Beer })[]>([]);
  const [yearlyRecords, setYearlyRecords] = useState<(ConsumptionRecord & { beer: Beer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'yearly'>('calendar');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentDate, view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'calendar') {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const { data } = await fetchRecords(monthStart, monthEnd);
        setRecords(data || []);
      } else {
        const yearStart = startOfYear(currentDate);
        const yearEnd = endOfYear(currentDate);
        const { data } = await fetchRecords(yearStart, yearEnd);
        setYearlyRecords(data || []);
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (startDate: Date, endDate: Date) => {
    const { data, error } = await supabase
      .from('consumption_records')
      .select(`*, beer:beers(*)`)
      .eq('user_id', user!.id)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .order('date', { ascending: true });

    if (error) throw error;
    return { data: data as (ConsumptionRecord & { beer: Beer })[] };
  };

  const calculateStats = (data: (ConsumptionRecord & { beer: Beer })[]): MonthlyStats => {
    if (data.length === 0) {
      return { totalQuantity: 0, totalVolume: 0, totalAlcohol: 0, drinkingDays: 0, maxInDay: 0, avgPerDay: 0, beerRanking: [] };
    }

    const dailyConsumption = data.reduce((acc, rec) => {
      acc[rec.date] = (acc[rec.date] || 0) + rec.quantity;
      return acc;
    }, {} as Record<string, number>);

    const totalQuantity = data.reduce((sum, r) => sum + r.quantity, 0);
    const totalVolume = data.reduce((sum, r) => sum + r.beer.volume * r.quantity, 0);
    const totalAlcohol = data.reduce((sum, r) => sum + (r.beer.volume * r.beer.alcohol_percentage / 100) * r.quantity, 0);
    const drinkingDays = Object.keys(dailyConsumption).length;
    const maxInDay = Math.max(...Object.values(dailyConsumption));
    const avgPerDay = drinkingDays > 0 ? totalQuantity / drinkingDays : 0;

    const beerCounts = data.reduce((acc, rec) => {
      if (!acc[rec.beer.id]) {
        acc[rec.beer.id] = { beer: rec.beer, quantity: 0, volume: 0 };
      }
      acc[rec.beer.id].quantity += rec.quantity;
      acc[rec.beer.id].volume += rec.beer.volume * rec.quantity;
      return acc;
    }, {} as Record<string, { beer: Beer; quantity: number; volume: number }>);

    const beerRanking = Object.values(beerCounts)
      .sort((a, b) => b.quantity - a.quantity);

    return { totalQuantity, totalVolume, totalAlcohol, drinkingDays, maxInDay, avgPerDay, beerRanking };
  };

  const monthlyStats = useMemo(() => calculateStats(records), [records]);
  const yearlyStats = useMemo(() => calculateStats(yearlyRecords), [yearlyRecords]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate]);

  const startingDay = useMemo(() => getDay(startOfMonth(currentDate)), [currentDate]);

  const navigateMonth = (direction: 'prev' | 'next') => setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  const navigateYear = (direction: 'prev' | 'next') => setCurrentDate(prev => new Date(getYear(prev) + (direction === 'prev' ? -1 : 1), 0, 1));

  const handleDateClick = (date: Date) => {
    navigate(`/record?date=${format(date, 'yyyy-MM-dd')}`);
  };

  const StatCard = ({ icon, value, label, color }: { icon: React.ElementType, value: string | number, label: string, color: string }) => (
    <div className="bg-white p-4 rounded-xl shadow-md flex items-center space-x-4">
      <div className={`p-3 rounded-full ${color}`}>
        {React.createElement(icon, { size: 24, className: "text-white" })}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );

  const BeerRanking = ({ ranking }: { ranking: { beer: Beer; quantity: number; volume: number }[] }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <Trophy size={20} className="mr-2 text-amber-500" /> 선호 맥주 랭킹
      </h3>
      {ranking.length > 0 ? (
        <ul className="space-y-4">
          {ranking.map((item, index) => (
            <li key={item.beer.id} className="flex items-center space-x-4">
              <span className="text-2xl font-bold w-8">{['🥇', '🥈', '🥉'][index] || '•'}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {item.beer.name}{' '}
                  <span className="text-sm text-gray-500">({item.beer.type})</span>
                </p>
                <p className="text-sm text-gray-500">{item.quantity}잔 · {item.volume.toLocaleString()}ml</p>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-gray-500 text-center py-4">데이터가 없습니다.</p>}
    </div>
  );

  const renderCalendar = () => (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <div className="grid grid-cols-7 gap-1 text-center">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="p-2 text-sm font-medium text-gray-500">{day}</div>
        ))}
        {Array.from({ length: startingDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {monthDays.map(date => {
          const dayTotal = records.filter(r => isSameDay(new Date(r.date), date)).reduce((sum, r) => sum + r.quantity, 0);
          const isToday = isSameDay(date, new Date());
          const hasRecords = dayTotal > 0;

          return (
            <div 
              key={date.toISOString()} 
              className={`aspect-square p-1 rounded-lg text-sm flex flex-col justify-between transition-all ${
                isToday ? 'bg-primary-light/30 border-2 border-primary' : ''
              } ${
                hasRecords ? 'bg-secondary-light/20 cursor-pointer hover:bg-secondary-light/40' : 'hover:bg-gray-50'
              }`}
              onClick={() => hasRecords && handleDateClick(date)}
            >
              <span className={`${isToday ? 'font-bold text-primary-dark' : 'text-gray-900'}`}>{format(date, 'd')}</span>
              {hasRecords && <span className="text-base text-secondary-dark font-medium self-center">{dayTotal}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderYearlyBreakdown = () => {
    const monthlyData = Array.from({ length: 12 }).map((_, i) => {
        const monthStart = new Date(getYear(currentDate), i, 1);
        const monthRecords = yearlyRecords.filter(r => new Date(r.date).getMonth() === i);
        return { month: format(monthStart, 'M월', { locale: ko }), stats: calculateStats(monthRecords) };
    });

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <CalendarIcon size={20} className="mr-2 text-primary" /> 월별 상세
            </h3>
            <div className="space-y-3">
                {monthlyData.map(({ month, stats }) => (
                    <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900 w-12">{month}</span>
                        <div className="flex-1 grid grid-cols-3 text-sm text-right">
                            <span className="text-primary-dark">{stats.totalQuantity}잔</span>
                            <span className="text-secondary-dark">{(stats.totalVolume / 1000).toFixed(1)}L</span>
                            <span className="text-accent-dark">{stats.drinkingDays}일</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  if (loading) return <div className="p-4 text-center">로딩 중...</div>;

  const statsToDisplay = view === 'calendar' ? monthlyStats : yearlyStats;

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">통계</h2>
        <div className="flex bg-primary-light/20 rounded-lg p-1">
          <button onClick={() => setView('calendar')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-white text-primary-dark shadow-sm' : 'text-gray-600 hover:text-primary-dark'}`}>월별</button>
          <button onClick={() => setView('yearly')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${view === 'yearly' ? 'bg-white text-primary-dark shadow-sm' : 'text-gray-600 hover:text-primary-dark'}`}>연별</button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => view === 'calendar' ? navigateMonth('prev') : navigateYear('prev')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={20} /></button>
          <h3 className="text-lg font-semibold text-gray-800">
            {format(currentDate, view === 'calendar' ? 'yyyy년 M월' : 'yyyy년', { locale: ko })}
          </h3>
          <button onClick={() => view === 'calendar' ? navigateMonth('next') : navigateYear('next')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={GlassWater} value={statsToDisplay.totalQuantity} label="총 음주량 (잔)" color="bg-primary" />
        <StatCard icon={Sigma} value={`${(statsToDisplay.totalVolume / 1000).toFixed(2)} L`} label="총 음주량 (부피)" color="bg-secondary" />
        <StatCard icon={Percent} value={`${statsToDisplay.totalAlcohol.toFixed(2)} ml`} label="총 순수 알코올" color="bg-accent" />
        <StatCard icon={CalendarDays} value={statsToDisplay.drinkingDays} label="총 음주일" color="bg-blue-500" />
        <StatCard icon={TrendingUp} value={statsToDisplay.maxInDay} label="하루 최대 음주량" color="bg-indigo-500" />
        <StatCard icon={Trophy} value={statsToDisplay.avgPerDay.toFixed(1)} label="평균 음주량 (잔/일)" color="bg-cyan-500" />
      </div>

      <BeerRanking ranking={statsToDisplay.beerRanking} />

      {view === 'calendar' ? renderCalendar() : renderYearlyBreakdown()}
    </div>
  );
};

export default StatsPage;
