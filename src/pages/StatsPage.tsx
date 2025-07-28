import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BarChart3, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ConsumptionRecord } from '../types';
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
  endOfYear
} from 'date-fns';
import { ko } from 'date-fns/locale';

const StatsPage: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [yearlyStats, setYearlyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'yearly'>('calendar');

  useEffect(() => {
    if (user) {
      if (view === 'calendar') {
        loadMonthlyRecords();
      } else {
        loadYearlyStats();
      }
    }
  }, [user, currentDate, view]);

  const loadMonthlyRecords = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('consumption_records')
        .select(`
          *,
          beer:beers(name, volume, alcohol_percentage)
        `)
        .eq('user_id', user!.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading monthly records:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadYearlyStats = async () => {
    try {
      setLoading(true);
      const year = getYear(currentDate);
      const yearStart = startOfYear(new Date(year, 0, 1));
      const yearEnd = endOfYear(new Date(year, 11, 31));

      const { data, error } = await supabase
        .from('consumption_records')
        .select(`
          *,
          beer:beers(name, volume, alcohol_percentage)
        `)
        .eq('user_id', user!.id)
        .gte('date', format(yearStart, 'yyyy-MM-dd'))
        .lte('date', format(yearEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      // Group by month
      const monthlyData: any = {};
      data?.forEach(record => {
        const month = format(new Date(record.date), 'yyyy-MM');
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            totalQuantity: 0,
            totalAlcohol: 0,
            daysConsumed: new Set()
          };
        }
        monthlyData[month].totalQuantity += record.quantity;
        if (record.beer) {
          monthlyData[month].totalAlcohol += (record.beer.volume * record.beer.alcohol_percentage * record.quantity / 100);
        }
        monthlyData[month].daysConsumed.add(record.date);
      });

      const stats = Object.values(monthlyData).map((data: any) => ({
        ...data,
        daysConsumed: data.daysConsumed.size
      }));

      setYearlyStats(stats);
    } catch (error) {
      console.error('Error loading yearly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayRecords = (date: Date) => {
    return records.filter(record => 
      isSameDay(new Date(record.date), date)
    );
  };

  const getDayTotal = (date: Date) => {
    const dayRecords = getDayRecords(date);
    return dayRecords.reduce((sum, record) => sum + record.quantity, 0);
  };

  const getMonthTotal = () => {
    return records.reduce((sum, record) => sum + record.quantity, 0);
  };

  const getMonthAlcohol = () => {
    return records.reduce((sum, record) => {
      if (record.beer) {
        return sum + (record.beer.volume * record.beer.alcohol_percentage * record.quantity / 100);
      }
      return sum;
    }, 0);
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      new Date(getYear(prev) + (direction === 'prev' ? -1 : 1), 0, 1)
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">통계</h2>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              view === 'calendar' 
                ? 'bg-white text-amber-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            월별
          </button>
          <button
            onClick={() => setView('yearly')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              view === 'yearly' 
                ? 'bg-white text-amber-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            연별
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <>
          {/* Month Navigation */}
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-lg font-semibold">
                {format(currentDate, 'yyyy년 M월', { locale: ko })}
              </h3>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Month Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{getMonthTotal()}</p>
                <p className="text-sm text-gray-600">총 잔수</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(getMonthAlcohol() * 100) / 100}ml
                </p>
                <p className="text-sm text-gray-600">순알코올</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {new Set(records.map(r => r.date)).size}
                </p>
                <p className="text-sm text-gray-600">음주 일수</p>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="p-2 text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              
              {getDaysInMonth().map(date => {
                const dayTotal = getDayTotal(date);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`aspect-square p-1 rounded-lg text-sm ${
                      isToday 
                        ? 'bg-amber-100 border-2 border-amber-400' 
                        : dayTotal > 0 
                          ? 'bg-blue-100' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="h-full flex flex-col justify-between">
                      <span className={`${isToday ? 'font-bold text-amber-600' : 'text-gray-900'}`}>
                        {format(date, 'd')}
                      </span>
                      {dayTotal > 0 && (
                        <span className="text-xs text-blue-600 font-medium">
                          {dayTotal}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Year Navigation */}
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => navigateYear('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-lg font-semibold">
                {getYear(currentDate)}년 통계
              </h3>
              <button
                onClick={() => navigateYear('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Yearly Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {yearlyStats.reduce((sum, stat) => sum + stat.totalQuantity, 0)}
                </p>
                <p className="text-sm text-gray-600">연간 총 잔수</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(yearlyStats.reduce((sum, stat) => sum + stat.totalAlcohol, 0) * 100) / 100}ml
                </p>
                <p className="text-sm text-gray-600">연간 순알코올</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {yearlyStats.reduce((sum, stat) => sum + stat.daysConsumed, 0)}
                </p>
                <p className="text-sm text-gray-600">연간 음주 일수</p>
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="space-y-3">
              {Array.from({ length: 12 }).map((_, index) => {
                const monthKey = format(new Date(getYear(currentDate), index, 1), 'yyyy-MM');
                const monthData = yearlyStats.find(stat => stat.month === monthKey);
                
                return (
                  <div key={monthKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">
                      {format(new Date(getYear(currentDate), index, 1), 'M월', { locale: ko })}
                    </span>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-amber-600">
                        {monthData?.totalQuantity || 0}잔
                      </span>
                      <span className="text-blue-600">
                        {Math.round((monthData?.totalAlcohol || 0) * 100) / 100}ml
                      </span>
                      <span className="text-green-600">
                        {monthData?.daysConsumed || 0}일
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsPage;