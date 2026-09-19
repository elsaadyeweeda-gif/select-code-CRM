/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Visit } from '../types';
import { 
  X, User, Phone, MapPin, Calendar, Briefcase, 
  MessageSquare, Sparkles, AlertCircle, Map, DollarSign, ExternalLink
} from 'lucide-react';

interface VisitDetailModalProps {
  isOpen: boolean;
  visit: Visit | null;
  onClose: () => void;
}

export default function VisitDetailModal({ isOpen, visit, onClose }: VisitDetailModalProps) {
  if (!isOpen || !visit) return null;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ar-SA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-[1010] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white border select-text border-slate-100 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl text-right animate-scaleIn font-sans" 
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer font-bold p-1 bg-white/5 hover:bg-white/10 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-[10px] font-mono font-bold text-teal-300 bg-slate-800 px-2 py-0.5 rounded-md">
                معرف الزيارة: {visit.id}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                visit.visitType === 'زيارة جديدة' ? 'bg-teal-600 text-white' : 'bg-blue-600 text-white'
              }`}>
                {visit.visitType}
              </span>
            </div>
            <h3 className="text-base font-black font-sans mt-0.5">تفاصيل تقرير الزيارة الميدانية الموثقة</h3>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Header metrics */}
          <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-4 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 block font-bold mb-0.5">المندوب المسؤول</span>
              <span className="text-sm font-black text-gray-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>{visit.repName}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-bold mb-0.5">التوقيت والتاريخ</span>
              <span className="text-sm font-bold text-gray-800 font-mono">{formatDate(visit.timestamp)}</span>
            </div>
          </div>

          {/* Company Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-teal-850 border-b border-teal-50 pb-1 flex items-center justify-start gap-1">
              <Briefcase className="w-4 h-4 text-teal-600" />
              <span>بيانات العميل والمؤسسة</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="text-[10px] text-slate-400 block">اسم التاجر / الشركة</span>
                <span className="text-sm font-black text-slate-900">{visit.customerName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">الجوال المعتمد</span>
                <span className="text-sm font-bold font-mono text-slate-850 flex items-center gap-1 block">
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  <a href={`tel:${visit.phone}`} className="hover:underline">{visit.phone || 'غير مسجل'}</a>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-650 pt-2">
              <div>
                <span className="text-[10px] text-slate-400 block">الشخص المسؤول</span>
                <span className="font-bold text-gray-900">{visit.contactPerson || '--'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">المسمى الوظيفي</span>
                <span className="font-semibold text-gray-950">{visit.jobTitle || '--'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">المظلة / المحافظة</span>
                <span className="font-semibold text-gray-900">{visit.province || '--'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">قيمة الفرصة المتوقعة</span>
                <span className="font-bold text-slate-900 font-mono text-teal-700">
                  {visit.expectedOpportunityValue || (visit as any).opportunityValue || 0} ريال
                </span>
              </div>
            </div>
          </div>

          {/* Location coordinate maps button if applicable */}
          {visit.latitude && visit.longitude && (
            <div className="p-3 bg-teal-50/40 rounded-2xl border border-teal-100 flex justify-between items-center text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-teal-800 font-black">إحداثيات الموقع المسجل (GPS Location)</span>
                <p className="text-[10px] text-slate-500 font-mono">طول: {visit.longitude} | عرض: {visit.latitude}</p>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${visit.latitude},${visit.longitude}`}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                className="py-1.5 px-3 bg-white hover:bg-teal-50 border border-teal-200 text-teal-700 font-bold text-[11px] rounded-xl flex items-center gap-1 transition-all shadow-3xs"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>خريطة جوجل 🗺️</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {/* Meeting summary based on type */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-black text-indigo-850 border-b border-indigo-55 pb-1 flex items-center justify-start gap-1">
              <MessageSquare className="w-4 h-4 text-indigo-650" />
              <span>وقائع المقابلة ومطالب المشروع</span>
            </h4>

            {visit.visitType === 'زيارة جديدة' ? (
              <div className="space-y-3.5">
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 block mb-1 font-bold">ملخص وقائع المعاينة الميدانية</span>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{visit.summary || 'لا يوجد تفاصيل مسجلة.'}</p>
                </div>

                {visit.needs && (
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                    <span className="text-[10px] text-slate-400 block mb-1 font-bold">المتطلبات التقنية والحلول المذكورة</span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{visit.needs}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-orange-50 border border-orange-100/70 rounded-xl">
                    <span className="text-[10px] text-orange-850 block mb-0.5">المنتج المطلوب بالصفقة</span>
                    <span className="text-xs font-black text-orange-950">{visit.requestedProduct || 'غير محدد'}</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100/70 rounded-xl">
                    <span className="text-[10px] text-amber-850 block mb-0.5">مستوى اهتمام التاجر</span>
                    <span className="text-xs font-black text-amber-950">{(visit.interestLevel as string) || 'متوسط'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 block mb-1 font-bold">ملاحظات تتبع المتابعة المكتوبة</span>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{visit.followUpNotes || visit.summary || 'لا يوجد ملاحظات.'}</p>
                </div>

                {visit.followUpResult && (
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                    <span className="text-[10px] text-slate-400 block mb-1 font-bold">نتيجة الزيارة السابقة والمحصلة</span>
                    <p className="text-xs text-slate-750 leading-relaxed whitespace-pre-wrap">{visit.followUpResult}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Follow-up Schedule and commercial statuses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="bg-teal-50/30 p-4 rounded-2xl border border-teal-100/50">
              <span className="text-[10px] text-teal-800 block">حالة العميل النهائية</span>
              <span className="text-sm font-black text-slate-900 block mt-1">{visit.customerStatus}</span>
            </div>

            {visit.nextStep ? (
              <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50">
                <span className="text-[10px] text-amber-800 block">المتابعة والخطوة القادمة</span>
                <span className="text-xs font-bold text-slate-800 block mt-1 leading-normal">
                  {visit.nextStep}
                  {visit.nextFollowUpDate && (
                    <span className="block mt-1 text-[10px] text-slate-405 font-mono">
                      مجدولة بتاريخ: {visit.nextFollowUpDate}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div className="border border-dashed p-4 rounded-2xl flex items-center justify-center text-slate-400 text-xs text-center">
                <span>لا توجد مواعيد تالية مجدولة</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
          >
            إغلاق التفاصيل
          </button>
        </div>
      </div>
    </div>
  );
}
