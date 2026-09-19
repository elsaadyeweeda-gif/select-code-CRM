/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FollowUpTask, Visit } from '../types';
import { generateFollowUps } from '../data/mockData';
import { Calendar, Search, AlertCircle, Clock, CheckCircle2, User, Filter } from 'lucide-react';

interface FollowUpsViewProps {
  visits: Visit[];
  userRole: 'manager' | 'rep';
  repName: string;
}

export default function FollowUpsView({ visits, userRole, repName }: FollowUpsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'الكل' | 'فائتة' | 'اليوم' | 'قادمة' | 'مكتملة'>('الكل');

  // Compute tasks dynamically from current visits state
  const tasks = useMemo(() => {
    let list = generateFollowUps(visits);
    
    // If logged in as representative, filter tasks to his own scope!
    if (userRole === 'rep') {
      list = list.filter(t => t.repName === repName);
    }
    
    return list;
  }, [visits, userRole, repName]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.repName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'الكل' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  // Color mapping based on rules: Red = Overdue, Yellow = Due Today, Green = Upcoming
  const getBadgeStyle = (status: 'فائتة' | 'اليوم' | 'قادمة' | 'مكتملة') => {
    switch (status) {
      case 'فائتة': // Red / Overdue
        return {
          wrapper: 'bg-rose-50 border-rose-200 text-rose-800',
          indicator: 'bg-rose-500',
          text: 'متأخرة'
        };
      case 'اليوم': // Yellow / Due Today
        return {
          wrapper: 'bg-amber-50 border-amber-300 text-amber-850',
          indicator: 'bg-amber-500',
          text: 'اليوم'
        };
      case 'قادمة': // Green / Upcoming
        return {
          wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          indicator: 'bg-emerald-500',
          text: 'مجدولة قادمة'
        };
      case 'مكتملة':
        return {
          wrapper: 'bg-slate-50 border-slate-200 text-slate-500',
          indicator: 'bg-slate-450',
          text: 'تم التعاقد'
        };
      default:
        return {
          wrapper: 'bg-gray-50 border-gray-100 text-gray-500',
          indicator: 'bg-gray-400',
          text: 'أخرى'
        };
    }
  };

  return (
    <div className="space-y-6" id="followups-module-container">
      
      {/* Search and Filters Segment */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs text-right space-y-4" dir="rtl">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Search box */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="ابحث باسم العميل أو اسم مندوب المبيعات المتابع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none text-right"
            />
          </div>

          {/* Quick status filters */}
          <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('الكل')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                statusFilter === 'الكل'
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              الكل ({tasks.length})
            </button>
            
            <button
              onClick={() => setStatusFilter('فائتة')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
                statusFilter === 'فائتة'
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span>فائتة / متأخرة ({tasks.filter(t => t.status === 'فائتة').length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('اليوم')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
                statusFilter === 'اليوم'
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span>تسليمات اليوم ({tasks.filter(t => t.status === 'اليوم').length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('قادمة')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
                statusFilter === 'قادمة'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>متابعات قادمة ({tasks.filter(t => t.status === 'قادمة').length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task List Grid */}
      <div className="space-y-4 text-right" dir="rtl">
        {filteredTasks.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-xs">
            <p className="text-gray-500 text-sm">لا يوجد مواعيد متابعة مطابقة للخيارات المتوفرة حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
              const style = getBadgeStyle(task.status);
              return (
                <div 
                  key={task.id}
                  className={`border rounded-2xl p-5 bg-white shadow-xs transition-all flex flex-col justify-between gap-4 ${
                    task.status === 'فائتة' ? 'border-rose-100/75 hover:border-rose-200' :
                    task.status === 'اليوم' ? 'border-amber-200 hover:border-amber-300' :
                    'border-gray-100 hover:border-blue-100'
                  }`}
                >
                  <div className="space-y-2.5 text-right">
                    <div className="flex justify-between items-center">
                      {/* Priority highlight color circle indicators */}
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 h-6 ${style.wrapper}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.indicator}`} />
                        <span>{style.text}</span>
                      </span>

                      <span className="text-xs text-gray-400 font-medium font-mono">{task.id}</span>
                    </div>

                    <h4 className="text-base font-bold text-gray-900 font-sans">{task.customerName}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed font-sans">{task.notes || 'لا يوجد تفاصيل تفاوض لحركة الزيارة.'}</p>
                  </div>

                  {/* Date details and assignment */}
                  <div className="border-t border-gray-50 pt-3.5 flex justify-between items-center text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800">المندوب: {task.repName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{task.followUpDate}</span>
                      </span>

                      {task.status !== 'مكتملة' && (
                        <span className={`text-[11px] font-bold ${
                          task.daysRemaining < 0 ? 'text-rose-600' : 
                          task.daysRemaining === 0 ? 'text-amber-600' : 
                          'text-emerald-600'
                        }`}>
                          {task.daysRemaining < 0 ? `متأخرة منذ ${Math.abs(task.daysRemaining)} يوم` :
                           task.daysRemaining === 0 ? 'اليوم!' :
                           `متبقي ${task.daysRemaining} يوم`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
