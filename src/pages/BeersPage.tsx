import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Beer } from '../types';

const BeersPage: React.FC = () => {
  const { user } = useAuth();
  const [beers, setBeers] = useState<Beer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '캔' as const,
    volume: '',
    alcohol_percentage: ''
  });

  useEffect(() => {
    if (user) {
      loadBeers();
    }
  }, [user]);

  const loadBeers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('beers')
        .select('*')
        .eq('user_id', user!.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setBeers(data || []);
    } catch (error) {
      console.error('Error loading beers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const beerData = {
        name: formData.name,
        type: formData.type,
        volume: parseFloat(formData.volume),
        alcohol_percentage: parseFloat(formData.alcohol_percentage),
        user_id: user!.id,
        sort_order: editingBeer ? editingBeer.sort_order : beers.length
      };

      if (editingBeer) {
        const { error } = await supabase
          .from('beers')
          .update(beerData)
          .eq('id', editingBeer.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('beers')
          .insert([beerData]);
        
        if (error) throw error;
      }

      setFormData({ name: '', type: '캔', volume: '', alcohol_percentage: '' });
      setShowForm(false);
      setEditingBeer(null);
      loadBeers();
    } catch (error) {
      console.error('Error saving beer:', error);
    }
  };

  const handleEdit = (beer: Beer) => {
    setEditingBeer(beer);
    setFormData({
      name: beer.name,
      type: beer.type,
      volume: beer.volume.toString(),
      alcohol_percentage: beer.alcohol_percentage.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 맥주를 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('beers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadBeers();
    } catch (error) {
      console.error('Error deleting beer:', error);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingBeer(null);
    setFormData({ name: '', type: '캔', volume: '', alcohol_percentage: '' });
  };

  const moveBeer = async (index: number, direction: 'up' | 'down') => {
    const newBeers = [...beers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= beers.length) return;

    [newBeers[index], newBeers[targetIndex]] = [newBeers[targetIndex], newBeers[index]];

    const updates = newBeers.map((beer, i) => 
      supabase.from('beers').update({ sort_order: i }).eq('id', beer.id)
    );

    try {
      await Promise.all(updates);
      setBeers(newBeers);
    } catch (error) {
      console.error('Error reordering beers:', error);
      // Optionally revert state on error
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">맥주 관리</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-primary to-secondary text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingBeer ? '맥주 수정' : '새 맥주 추가'}
            </h3>
            <button
              onClick={cancelForm}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                맥주 이름
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="예: 하이네켄"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종류
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="캔">캔</option>
                  <option value="병">병</option>
                  <option value="생맥주">생맥주</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  용량 (ml)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="330"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                알코올 도수 (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.alcohol_percentage}
                onChange={(e) => setFormData({ ...formData, alcohol_percentage: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="5.0"
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 rounded-lg font-medium hover:from-primary-dark hover:to-secondary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
              >
                <Save size={20} className="inline mr-2" />
                {editingBeer ? '수정' : '추가'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {beers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">등록된 맥주가 없습니다</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-medium hover:from-primary-dark hover:to-secondary-dark transition-all"
            >
              첫 맥주 추가하기
            </button>
          </div>
        ) : (
          beers.map((beer, index) => (
            <div key={beer.id} className="bg-white rounded-xl p-4 shadow-md">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-center">
                  <button onClick={() => moveBeer(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30">
                    <ArrowUp size={16} />
                  </button>
                  <button onClick={() => moveBeer(index, 'down')} disabled={index === beers.length - 1} className="p-1 disabled:opacity-30">
                    <ArrowDown size={16} />
                  </button>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{beer.name}</h3>
                  <p className="text-sm text-gray-600">
                    {beer.type} · {beer.volume}ml · {beer.alcohol_percentage}%
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(beer)}
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(beer.id)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BeersPage;