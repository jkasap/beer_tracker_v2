import React, { useState, useEffect } from 'react';
import { CalendarDays, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Beer, ConsumptionRecord } from '../types';
import { format } from 'date-fns';

const RecordPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [beers, setBeers] = useState<Beer[]>([]);
  const [records, setRecords] = useState<{ [key: string]: number }>({});
  const [existingRecords, setExistingRecords] = useState<ConsumptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadBeers();
      loadRecords();
    }
  }, [user, selectedDate]);

  const loadBeers = async () => {
    try {
      const { data, error } = await supabase
        .from('beers')
        .select('*')
        .eq('user_id', user!.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setBeers(data || []);
    } catch (error) {
      console.error('Error loading beers:', error);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('consumption_records')
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', selectedDate);

      if (error) throw error;
      
      setExistingRecords(data || []);
      
      // Convert to records object for form
      const recordsObj: { [key: string]: number } = {};
      data?.forEach(record => {
        recordsObj[record.beer_id] = record.quantity;
      });
      setRecords(recordsObj);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (beerId: string, quantity: string) => {
    const qty = quantity === '' ? 0 : parseFloat(quantity);
    setRecords(prev => ({
      ...prev,
      [beerId]: qty
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Delete existing records for this date
      if (existingRecords.length > 0) {
        const { error: deleteError } = await supabase
          .from('consumption_records')
          .delete()
          .eq('user_id', user!.id)
          .eq('date', selectedDate);

        if (deleteError) throw deleteError;
      }

      // Insert new records
      const recordsToInsert = Object.entries(records)
        .filter(([_, quantity]) => quantity > 0)
        .map(([beerId, quantity]) => ({
          date: selectedDate,
          beer_id: beerId,
          quantity,
          user_id: user!.id
        }));

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('consumption_records')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }

      loadRecords();
    } catch (error) {
      console.error('Error saving records:', error);
    } finally {
      setSaving(false);
    }
  };

  const getTotalQuantity = () => {
    return Object.values(records).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  const getTotalAlcohol = () => {
    return Object.entries(records).reduce((sum, [beerId, quantity]) => {
      const beer = beers.find(b => b.id === beerId);
      if (beer && quantity > 0) {
        return sum + (beer.volume * beer.alcohol_percentage * quantity / 100);
      }
      return sum;
    }, 0);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">소비 기록</h2>
        
        <div className="bg-white rounded-xl p-4 shadow-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            날짜 선택
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <CalendarDays className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {beers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">등록된 맥주가 없습니다</p>
          <p className="text-sm text-gray-400">먼저 맥주를 등록해주세요</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {beers.map((beer) => (
              <div key={beer.id} className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {beer.name}{' '}
                      <span className="text-sm text-gray-500">({beer.type})</span>
                    </h3>
                    <p className="text-sm text-gray-600">
                      {beer.volume}ml · {beer.alcohol_percentage}%
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">잔</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={records[beer.id] || ''}
                      onChange={(e) => handleQuantityChange(beer.id, e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getTotalQuantity() > 0 && (
            <div className="bg-primary-light/20 rounded-xl p-4 border border-primary-light">
              <h4 className="font-semibold text-primary-dark mb-2">오늘의 총합</h4>
              <div className="space-y-1 text-sm">
                <p className="text-primary-dark">
                  총 {getTotalQuantity()}잔
                </p>
                <p className="text-primary-dark">
                  순알코올 약 {Math.round(getTotalAlcohol() * 100) / 100}ml
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white py-4 px-4 rounded-xl font-semibold hover:from-primary-dark hover:to-secondary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} className="inline mr-2" />
            {saving ? '저장 중...' : '기록 저장'}
          </button>
        </>
      )}
    </div>
  );
};

export default RecordPage;