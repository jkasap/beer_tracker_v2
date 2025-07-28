import React, { useState, useEffect } from 'react';
import { BarChart3, Beer, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalBeers: 0,
    thisMonthConsumption: 0,
    totalConsumption: 0,
    averageDaily: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Get total beers count
      const { count: beersCount } = await supabase
        .from('beers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Get this month's consumption
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data: monthlyData } = await supabase
        .from('consumption_records')
        .select('quantity')
        .eq('user_id', user!.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      const thisMonthTotal = monthlyData?.reduce((sum, record) => sum + record.quantity, 0) || 0;

      // Get total consumption
      const { data: totalData } = await supabase
        .from('consumption_records')
        .select('quantity')
        .eq('user_id', user!.id);

      const totalConsumption = totalData?.reduce((sum, record) => sum + record.quantity, 0) || 0;

      // Calculate average daily (this month)
      const daysInMonth = now.getDate();
      const averageDaily = thisMonthTotal / daysInMonth;

      setStats({
        totalBeers: beersCount || 0,
        thisMonthConsumption: thisMonthTotal,
        totalConsumption,
        averageDaily: Math.round(averageDaily * 100) / 100
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: Beer,
      title: '맥주 관리',
      description: '맥주 종류 추가 및 편집',
      action: () => navigate('/beers'),
      color: 'from-amber-500 to-yellow-500'
    },
    {
      icon: Calendar,
      title: '소비 기록',
      description: '오늘 마신 맥주 기록',
      action: () => navigate('/record'),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: BarChart3,
      title: '통계 보기',
      description: '월별 소비 패턴 분석',
      action: () => navigate('/stats'),
      color: 'from-green-500 to-emerald-500'
    }
  ];

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요! 👋
        </h2>
        <p className="text-gray-600">
          {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Beer className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">등록된 맥주</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalBeers}개</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">이번 달</p>
              <p className="text-xl font-bold text-gray-900">{stats.thisMonthConsumption}잔</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">전체 누적</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalConsumption}잔</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">일평균</p>
              <p className="text-xl font-bold text-gray-900">{stats.averageDaily}잔</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 실행</h3>
        <div className="space-y-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="w-full bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 bg-gradient-to-br ${action.color} rounded-lg`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900">{action.title}</h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;