/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Visit } from '../types';
import { Search, Calendar, User, Eye, Briefcase, MessageSquare, Tag, FileClock, MapPin } from 'lucide-react';

interface VisitsViewProps {
  visits: Visit[];
  userRole: 'manager' | 'rep';
  repName: string;
}

export default function VisitsView({ visits, userRole, repName }: VisitsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('الكل');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  
  // Modal for detail view
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // Filter based on roles: Reps see only their own visits!
  const scopedVisits = useMemo(() => {
    if (userRole === 'rep') {
      return visits.filter(v => v.repName === repName);
    }
    return visits;
  }, [visits, userRole, repName]);

  const uniqueStatuses = useMemo(() => {
    return ['الكل', ...Array.from(new Set(scopedVisits.map(v => v.customerStatus)))];
  }, [scopedVisits]);

  const filteredVisits = useMemo(() => {
    return scopedVisits.filter(v => {
      const matchSearch = v.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.repName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = selectedType === 'الكل' || v.visitType === selectedType;
      const matchStatus = selectedStatus === 'الكل' || v.customerStatus === selectedStatus;
      
      return matchSearch && matchType && matchStatus;
    });
  }, [scopedVisits, searchTerm, selectedType, selectedStatus]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6" id="visits-database-container">
      
      {/* Search and Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs text-right space-y-4" dir="rtl">
        <h3 className="text-sm font-bold text-gray-900 mb-2">تصفية وتفتيش سجل الزيارات المكتملة</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {/* Search */}
          <div className="relative md:col-span-1">
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="ابحث باسم المندوب أو اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pr-9 pl-3 py-2 text-xs outline-none text-right"
            />
          </div>

          {/* Visit Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none text-right"
            >
              <option value="الكل">كل أنواع الزيارات</option>
              <option value="زيارة جديدة">زيارة جديدة للعميل</option>
              <option value="زيارة متابعة">زيارات متابعة سابقة</option>
            </select>
          </div>

          {/* Customer Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none text-right"
            >
              <option value="الكل">كل الحالات البيعية</option>
              {uniqueStatuses.filter(s => s !== 'الكل').map((st, i) => (
                <option key={i} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden text-right" dir="rtl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-gray-700 font-bold text-xs">
                <th className="p-3.5 text-right">رقم الزيارة</th>
                <th className="p-3.5 text-right">التاريخ والوقت</th>
                <th className="p-3.5 text-right animate-fadeIn">اسم التاجر / العميل</th>
                <th className="p-3.5 text-right">المندوب القائم</th>
                <th className="p-3.5 text-right">نوع الزيارة</th>
                <th className="p-3.5 text-right">الحالة البيعية</th>
                <th className="p-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600 text-xs">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    لا يوجد زيارات مسجلة تطابق مدخلات البحث الحالية.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-mono font-bold text-gray-900">{visit.id}</td>
                    <td className="p-3.5 text-gray-500 font-mono">{formatDate(visit.timestamp)}</td>
                    <td className="p-3.5 font-bold text-gray-900 font-sans">{visit.customerName}</td>
                    <td className="p-3.5 font-sans">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{visit.repName}</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        visit.visitType === 'زيارة جديدة' 
                          ? 'bg-blue-50 text-blue-800 border border-blue-105'
                          : 'bg-indigo-50 text-indigo-805 border border-indigo-105'
                      }`}>
                        {visit.visitType}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-gray-750">{visit.customerStatus}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedVisit(visit)}
                        className="p-1 px-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض التفاصيل</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL (Fully RTL Arabic layout) */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl text-right animate-scaleIn" dir="rtl">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center font-sans">
              <button 
                onClick={() => setSelectedVisit(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer font-bold text-lg leading-none"
              >
                ✕
              </button>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-blue-300 bg-slate-800 px-2 py-0.5 rounded-md">
                  معرف الزيارة: {selectedVisit.id}
                </span>
                <h3 className="text-base font-bold font-sans">تفاصيل تقرير الزيارة الميدانية</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Header metrics */}
              <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-4">
                <div>
                  <span className="text-[10px] text-gray-400 block">المندوب المسؤول</span>
                  <span className="text-sm font-bold text-gray-800">{selectedVisit.repName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">توقيت التسجيل الموثق</span>
                  <span className="text-sm font-bold text-gray-800 font-mono">{selectedVisit.timestamp.replace('T', ' ')}</span>
                </div>
              </div>

              {/* Company Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-blue-850 border-b border-blue-100 pb-1 flex items-center justify-end gap-1 font-sans">
                  <span>اسم المنشأة والمسؤول</span>
                  <Briefcase className="w-4 h-4" />
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="text-[10px] text-gray-400 block">اسم العميل والشركة</span>
                    <span className="text-sm font-black text-slate-900">{selectedVisit.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">رقم الجوال</span>
                    <span className="text-sm font-semibold font-mono text-slate-850">{selectedVisit.phone || 'غير مسجل'}</span>
                  </div>
                </div>

                {selectedVisit.visitType === 'زيارة جديدة' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-650">
                    <div>
                      <span className="text-[10px] text-gray-400 block">الشخص المسؤول</span>
                      <span className="font-semibold text-gray-900">{selectedVisit.contactPerson || '--'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">المسمى الوظيفي</span>
                      <span className="font-semibold text-gray-900">{selectedVisit.jobTitle || '--'}</span>
                    </div>
                    <div>
                       <span className="text-[10px] text-gray-400 block">العنوان</span>
                      <span className="font-semibold text-gray-900">{selectedVisit.province || '--'}</span>
                      {selectedVisit.latitude && selectedVisit.longitude && (
                        <div className="mt-1">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedVisit.latitude},${selectedVisit.longitude}`}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            rel="noopener noreferrer"
                            className="text-[10px] text-teal-650 hover:text-teal-850 font-extrabold inline-flex items-center gap-0.5 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100"
                          >
                            <MapPin className="w-2.5 h-2.5 text-teal-600" />
                            <span>خريطة جوجل 🗺️</span>
                          </a>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">المنتج المطلوب</span>
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-0.5">{selectedVisit.requestedProduct || '--'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Summary based on visit type */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-indigo-800 border-b border-indigo-50 pb-1 flex items-center justify-end gap-1 font-sans">
                  <span>خلاصة المقابلة والمخرجات</span>
                  <MessageSquare className="w-4 h-4" />
                </h4>

                {selectedVisit.visitType === 'زيارة جديدة' ? (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <span className="text-[10px] text-gray-400 block mb-1 font-bold">ملخص وقائع الاجتماع الميداني</span>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedVisit.summary}</p>
                    </div>

                    {selectedVisit.needs && (
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-gray-400 block mb-1 font-bold">المتطلبات البرمجية واحتياجات العميل</span>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedVisit.needs}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <span className="text-[10px] text-gray-400 block mb-1 font-bold">ملاحظات تتبع المتابعة</span>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedVisit.followUpNotes}</p>
                    </div>

                    {selectedVisit.followUpResult && (
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <span className="text-[10px] text-gray-400 block mb-1 font-bold">المكاسب ونتيجة المتابعة</span>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedVisit.followUpResult}</p>
                      </div>
                    )}

                    {selectedVisit.nextStep && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                          <span className="text-[10px] text-amber-800 block mb-0.5 font-bold">الخطوة القادمة المجدولة</span>
                          <p className="text-xs text-amber-900">{selectedVisit.nextStep}</p>
                        </div>
                        {selectedVisit.nextFollowUpDate && (
                          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                            <span className="text-[10px] text-blue-800 block mb-0.5 font-bold">تاريخ المتابعة القادم</span>
                            <p className="text-xs text-blue-900 font-mono font-bold">{selectedVisit.nextFollowUpDate}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Commercial Estimation and Attachment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-blue-50/50 p-4 rounded-2xl text-blue-900">
                  <span className="text-[10px] text-blue-800 block">حالة العميل الحالية</span>
                  <div className="flex items-baseline justify-between mt-1 text-xs">
                    <span className="font-bold">{selectedVisit.customerStatus}</span>
                  </div>
                </div>

                {selectedVisit.attachmentUrl ? (
                  <div className="border border-emerald-100 bg-emerald-50/20 p-4 rounded-2xl flex flex-col justify-center text-emerald-800">
                    <span className="text-[10px] text-emerald-700 block">المستندات أو الصور المرفقة</span>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); alert('تحميل الملف التجريبي: ' + selectedVisit.attachmentUrl); }}
                      className="text-xs font-bold font-sans underline mt-1 block hover:text-emerald-950"
                    >
                      عرض الملف المرفق (PDF/صورة)
                    </a>
                  </div>
                ) : (
                  <div className="border border-dashed p-4 rounded-2xl flex flex-col justify-center items-center text-gray-400">
                    <span className="text-[10px]">لا يوجد وثيقة أو ملف مرفق</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                onClick={() => setSelectedVisit(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-800 cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
