/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  Database, 
  Download, 
  Filter, 
  CheckCircle2, 
  X, 
  Loader2, 
  Calendar, 
  User, 
  MapPin, 
  ShieldAlert,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Customer, Visit } from '../types';

interface DataPurgeManagerProps {
  visits: Visit[];
  customers: Customer[];
  salesRepsList: string[];
  currentUser: any;
  triggerMessage: (type: 'success' | 'error' | 'info', text: string) => void;
  onDataPurged?: () => void;
}

export function DataPurgeManager({
  visits,
  customers,
  salesRepsList,
  currentUser,
  triggerMessage,
  onDataPurged
}: DataPurgeManagerProps) {
  // Tabs: 'complete' (حذف كلي) vs 'partial' (حذف جزئي ومخصص)
  const [purgeMode, setPurgeMode] = useState<'complete' | 'partial'>('complete');

  // Partial Cleanup Settings
  const [targetEntity, setTargetEntity] = useState<'visits' | 'customers'>('visits');
  const [selectedRep, setSelectedRep] = useState('الكل');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [selectedProvince, setSelectedProvince] = useState('الكل');
  const [selectedVisitType, setSelectedVisitType] = useState('الكل');
  const [deleteAssociatedVisitsWithCust, setDeleteAssociatedVisitsWithCust] = useState(true);

  // Safety Confirmation Modal States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [affectedCount, setAffectedCount] = useState(0);
  const [confirmationWord, setConfirmationWord] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  // Compute Provinces
  const provinces = useMemo(() => {
    const list = new Set(customers.map(c => c.province).filter(Boolean));
    return ['الكل', ...Array.from(list)];
  }, [customers]);

  // Compute Statuses
  const visitStatuses = useMemo(() => {
    const list = new Set(visits.map(v => v.customerStatus).filter(Boolean));
    return ['الكل', ...Array.from(list)];
  }, [visits]);

  const customerStatuses = useMemo(() => {
    const list = new Set(customers.map(c => c.currentStatus).filter(Boolean));
    return ['الكل', ...Array.from(list)];
  }, [customers]);

  // Compute Matching Items for Partial Purge
  const matchingVisits = useMemo(() => {
    return visits.filter(v => {
      if (selectedRep !== 'الكل' && v.repName !== selectedRep) return false;
      if (selectedStatus !== 'الكل' && v.customerStatus !== selectedStatus) return false;
      if (selectedVisitType !== 'الكل' && v.visitType !== selectedVisitType) return false;
      const vDate = (v.timestamp || '').split('T')[0];
      if (fromDate && vDate < fromDate) return false;
      if (toDate && vDate > toDate) return false;
      return true;
    });
  }, [visits, selectedRep, selectedStatus, selectedVisitType, fromDate, toDate]);

  const matchingCustomers = useMemo(() => {
    return customers.filter(c => {
      if (selectedRep !== 'الكل' && c.repName !== selectedRep) return false;
      if (selectedProvince !== 'الكل' && c.province !== selectedProvince) return false;
      if (selectedStatus !== 'الكل' && c.currentStatus !== selectedStatus) return false;
      return true;
    });
  }, [customers, selectedRep, selectedProvince, selectedStatus]);

  // Export Instant Backup Excel
  const handleExportBackup = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Export visits
      if (visits.length > 0) {
        const visitsData = visits.map(v => ({
          'المعرف': v.id,
          'التاريخ والوقت': v.timestamp,
          'اسم المندوب': v.repName,
          'اسم العميل': v.customerName,
          'نوع الزيارة': v.visitType,
          'الحالة البيعية': v.customerStatus,
          'الهاتف': v.phone || '',
          'المحافظة': v.province || '',
          'العنوان': v.address || '',
          'قيمة الفرصة المتوقعة': v.expectedOpportunityValue || 0,
          'الملخص': v.summary || '',
          'تاريخ المتابعة القادمة': v.nextFollowUpDate || ''
        }));
        const wsVisits = XLSX.utils.json_to_sheet(visitsData);
        XLSX.utils.book_append_sheet(wb, wsVisits, 'الزيارات');
      }

      // Export customers
      if (customers.length > 0) {
        const custData = customers.map(c => ({
          'المعرف': c.id,
          'اسم العميل': c.name,
          'المندوب': c.repName || '',
          'المحافظة': c.province || '',
          'الهاتف': c.phone || '',
          'الشخص المسؤول': c.contactPerson || '',
          'الحالة الحالية': c.currentStatus || '',
          'تاريخ أول زيارة': c.firstVisitDate || '',
          'تاريخ آخر زيارة': c.lastVisitDate || '',
          'عدد الزيارات': c.visitsCount || 0
        }));
        const wsCust = XLSX.utils.json_to_sheet(custData);
        XLSX.utils.book_append_sheet(wb, wsCust, 'العملاء');
      }

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `نسخة_احتياطية_CRM_${dateStr}.xlsx`);
      triggerMessage('success', 'تم تنزيل النسخة الاحتياطية بنجاح على جهازك');
    } catch (err: any) {
      triggerMessage('error', 'حدث خطأ أثناء تصدير النسخة الاحتياطية: ' + err.message);
    }
  };

  // Open Confirmation Modal
  const requestPurge = (actionKey: string, title: string, count: number) => {
    if (count === 0) {
      triggerMessage('info', 'لا توجد عناصر مطابقة لحذفها');
      return;
    }
    setPendingAction(actionKey);
    setActionTitle(title);
    setAffectedCount(count);
    setConfirmationWord('');
    setIsConfirmModalOpen(true);
  };

  // Execute Purge Call to Server
  const handleExecutePurge = async () => {
    if (confirmationWord.trim() !== 'تأكيد الحذف') {
      triggerMessage('error', 'يرجى كتابة عبارة "تأكيد الحذف" بدقة لتأكيد العملية');
      return;
    }

    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (!token) {
      triggerMessage('error', 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
      return;
    }

    setIsPurging(true);

    try {
      let payload: any = { action: pendingAction };

      if (pendingAction === 'delete_visits_filtered') {
        payload.filters = {
          repName: selectedRep,
          customerStatus: selectedStatus,
          visitType: selectedVisitType,
          fromDate,
          toDate
        };
      } else if (pendingAction === 'delete_customers_filtered') {
        payload.filters = {
          repName: selectedRep,
          province: selectedProvince,
          currentStatus: selectedStatus
        };
        payload.deleteAssociatedVisits = deleteAssociatedVisitsWithCust;
      } else if (pendingAction === 'wipe_customers') {
        payload.deleteAssociatedVisits = deleteAssociatedVisitsWithCust;
      }

      const res = await fetch('/api/admin/data/purge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'success') {
        triggerMessage('success', `تمت عملية الحذف بنجاح وتطهير السجلات`);
        setIsConfirmModalOpen(false);
        if (onDataPurged) {
          onDataPurged();
        }
      } else {
        triggerMessage('error', data.error || 'فشلت عملية الحذف');
      }
    } catch (err: any) {
      triggerMessage('error', 'حدث خطأ في الاتصال بالخادم: ' + err.message);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      
      {/* HEADER & OVERVIEW */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">مركز إدارة وتطهير البيانات لمدير النظام</h2>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              إمكانية حذف كافة الزيارات والعملاء كلياً، أو تصفية وحذف سجلات مخصصة جزئياً مع نظام تأمين ضد الحذف العرضي
            </p>
          </div>
        </div>

        {/* Quick Backup Button */}
        <button
          onClick={handleExportBackup}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-102 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>تنزيل نسخة احتياطية (Excel) قبل الحذف</span>
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي سجلات الزيارات</span>
            <span className="text-2xl font-black text-slate-900">{visits.length}</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-1">زيارة مسجلة في قاعدة البيانات</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي سجلات العملاء</span>
            <span className="text-2xl font-black text-slate-900">{customers.length}</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-1">عميل مسجل في قاعدة البيانات</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-1">مناديب المبيعات المعتمدين</span>
            <span className="text-2xl font-black text-slate-900">{salesRepsList.filter(n => n !== 'الكل' && n !== 'أخرى').length}</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-1">مندوب مسجل بالنظام</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* PURGE MODE SWITCHER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex border-b border-slate-100 pb-4 justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPurgeMode('complete')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                purgeMode === 'complete'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>الحذف الكلي (مسح شامل)</span>
            </button>
            <button
              onClick={() => setPurgeMode('partial')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                purgeMode === 'partial'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>الحذف الجزئي (حسب الفلترة والتخصيص)</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-bold">
            {purgeMode === 'complete' ? 'مسح شامل لكافة السجلات دفعة واحدة' : 'حذف دقيق لعناصر محددة بناءً على معايير مخصصة'}
          </span>
        </div>

        {/* ==================== COMPLETE PURGE MODE ==================== */}
        {purgeMode === 'complete' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-black text-rose-900">تنبيه أمني هام بشأن الحذف الكلي:</p>
                <p className="text-[11px] text-rose-700 leading-relaxed font-semibold">
                  العمليات أدناه تؤدي إلى إزالة السجلات نهائياً من قاعدة البيانات السحابية (Firestore / PostgreSQL). لا يمكن استرجاع هذه البيانات بعد تأكيد الحذف، لذا يرجى التأكد من تنزيل نسخة احتياطية أولاً.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Option 1: Wipe All Visits */}
              <div className="bg-slate-50/70 border border-slate-200 hover:border-rose-200 rounded-2xl p-5 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-lg">الزيارات فقط</span>
                    <span className="text-xs font-black text-slate-900">{visits.length} سجل</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">حذف كافة الزيارات كلياً</h4>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                    مسح شامل لجميع الزيارات الميدانية والملاحظات البيعية المسجلة، مع الحفاظ الكامل على قاعدة بيانات العملاء دون حذفهم.
                  </p>
                </div>
                <button
                  onClick={() => requestPurge('wipe_visits', 'حذف كافة الزيارات الميدانية كلياً', visits.length)}
                  disabled={visits.length === 0}
                  className="mt-5 w-full py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-transparent rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>مسح كل الزيارات ({visits.length})</span>
                </button>
              </div>

              {/* Option 2: Wipe All Customers */}
              <div className="bg-slate-50/70 border border-slate-200 hover:border-rose-200 rounded-2xl p-5 flex flex-col justify-between transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[10px] font-black rounded-lg">العملاء</span>
                    <span className="text-xs font-black text-slate-900">{customers.length} سجل</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">حذف كافة العملاء كلياً</h4>
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                    مسح شامل لقائمة العملاء والتجار المسجلين في النظام.
                  </p>
                  
                  <label className="flex items-center gap-2 mt-2 cursor-pointer text-[10.5px] font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={deleteAssociatedVisitsWithCust}
                      onChange={(e) => setDeleteAssociatedVisitsWithCust(e.target.checked)}
                      className="w-3.5 h-3.5 accent-rose-600 rounded cursor-pointer"
                    />
                    <span>حذف كافة الزيارات التابعة لهؤلاء العملاء أيضاً</span>
                  </label>
                </div>
                <button
                  onClick={() => requestPurge('wipe_customers', 'حذف كافة العملاء كلياً' + (deleteAssociatedVisitsWithCust ? ' مع زياراتهم' : ''), customers.length)}
                  disabled={customers.length === 0}
                  className="mt-5 w-full py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-transparent rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>مسح كل العملاء ({customers.length})</span>
                </button>
              </div>

              {/* Option 3: Full CRM Purge (Wipe All Visits & Customers) */}
              <div className="bg-rose-50/30 border-2 border-rose-200 hover:border-rose-400 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-black rounded-lg">مسح شامل</span>
                    <span className="text-xs font-black text-rose-900">{visits.length + customers.length} سجل</span>
                  </div>
                  <h4 className="text-sm font-black text-rose-950">تطهير كامل شامل (Reset All)</h4>
                  <p className="text-[11px] text-rose-800 font-bold leading-relaxed">
                    إعادة ضبط كاملة للنظام ومسح كافة سجلات الزيارات وكافة العملاء للبدء بسجل نظيف مع الإبقاء على حسابات المستخدمين وإعدادات النظام.
                  </p>
                </div>
                <button
                  onClick={() => requestPurge('wipe_all', 'مسح وتطهير شامل لكافة الزيارات والعملاء في النظام', visits.length + customers.length)}
                  disabled={visits.length === 0 && customers.length === 0}
                  className="mt-5 w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>مسح كلي شامل للزيارات والعملاء</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== PARTIAL PURGE MODE ==================== */}
        {purgeMode === 'partial' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Target Entity Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">تحديد نوع البيانات المراد تصفيتها وحذفها:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTargetEntity('visits')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    targetEntity === 'visits'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الزيارات الميدانية ({visits.length})
                </button>
                <button
                  onClick={() => setTargetEntity('customers')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    targetEntity === 'customers'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  العملاء والتجار ({customers.length})
                </button>
              </div>
            </div>

            {/* Filter Form Controls */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Sales Rep Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">مندوب المبيعات</label>
                <select
                  value={selectedRep}
                  onChange={(e) => setSelectedRep(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                >
                  <option value="الكل">كافة المناديب</option>
                  {salesRepsList.filter(n => n !== 'الكل').map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* If Visits: Dates */}
              {targetEntity === 'visits' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">من تاريخ زيارة</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">إلى تاريخ زيارة</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">الحالة البيعية</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    >
                      {visitStatuses.map((st, i) => (
                        <option key={i} value={st}>{st === 'الكل' ? 'كافة الحالات البيعية' : st}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* If Customers: Province & Status */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">المحافظة</label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    >
                      {provinces.map((p, i) => (
                        <option key={i} value={p}>{p === 'الكل' ? 'كافة المحافظات' : p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">الحالة الحالية</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    >
                      {customerStatuses.map((st, i) => (
                        <option key={i} value={st}>{st === 'الكل' ? 'كافة الحالات' : st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-[10.5px] font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={deleteAssociatedVisitsWithCust}
                        onChange={(e) => setDeleteAssociatedVisitsWithCust(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-600 rounded cursor-pointer"
                      />
                      <span>حذف زيارات هؤلاء العملاء أيضاً</span>
                    </label>
                  </div>
                </>
              )}

            </div>

            {/* Live Filter Preview & Trigger */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-right">
                <span className="text-xs font-black text-amber-900 block">
                  نتيجة المعاينة الحية للشروط المحددة:
                </span>
                <p className="text-[11px] text-amber-800 font-bold">
                  {targetEntity === 'visits' 
                    ? `سيتم حذف (${matchingVisits.length}) زيارة مطابقة من إجمالي (${visits.length}) زيارة`
                    : `سيتم حذف (${matchingCustomers.length}) عميل مطابق من إجمالي (${customers.length}) عميل`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedRep('الكل');
                    setFromDate('');
                    setToDate('');
                    setSelectedStatus('الكل');
                    setSelectedProvince('الكل');
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>

                <button
                  onClick={() => {
                    if (targetEntity === 'visits') {
                      requestPurge('delete_visits_filtered', `حذف جزئي لعدد (${matchingVisits.length}) زيارة مطابقة للشروط`, matchingVisits.length);
                    } else {
                      requestPurge('delete_customers_filtered', `حذف جزئي لعدد (${matchingCustomers.length}) عميل مطابق للشروط`, matchingCustomers.length);
                    }
                  }}
                  disabled={targetEntity === 'visits' ? matchingVisits.length === 0 : matchingCustomers.length === 0}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    تنفيذ حذف العناصر المطابقة (
                    {targetEntity === 'visits' ? matchingVisits.length : matchingCustomers.length}
                    )
                  </span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ==================== SAFETY CONFIRMATION MODAL ==================== */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl text-right animate-scaleUp space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black text-slate-900">تأكيد عملية الحذف الأمنية</h3>
              </div>
              <button
                onClick={() => !isPurging && setIsConfirmModalOpen(false)}
                disabled={isPurging}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                <span className="text-xs font-black text-rose-900 block">{actionTitle}</span>
                <span className="text-[11px] font-bold text-rose-700 block">
                  عدد السجلات المستهدفة بالحذف: <span className="font-mono text-sm underline">{affectedCount}</span> سجل
                </span>
              </div>

              <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                هذا الإجراء نهائي ولا يمكن التراجع عنه. لتفادي أي خطأ غير مقصود، يرجى كتابة العبارة التالية في الصندوق أدناه:
                <span className="block mt-1 font-mono font-black text-rose-600 text-center bg-slate-100 py-1 rounded-lg">
                  تأكيد الحذف
                </span>
              </p>

              <div>
                <input
                  type="text"
                  placeholder="اكتب هنا: تأكيد الحذف"
                  value={confirmationWord}
                  onChange={(e) => setConfirmationWord(e.target.value)}
                  disabled={isPurging}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2 text-xs font-black text-center outline-none transition-all"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isPurging}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer transition-all disabled:opacity-50"
              >
                إلغاء وتراجع
              </button>
              
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={isPurging || confirmationWord.trim() !== 'تأكيد الحذف'}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPurging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، قم بالحذف النهائي</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
