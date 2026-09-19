/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UserAccount, SupportTask } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  BarChart4, ClipboardList, Target, Percent, RefreshCw, 
  AlertTriangle, CheckCircle, Wrench, Phone, Star, TrendingUp, Calendar,
  Search, Download, Filter, FileSpreadsheet, CheckSquare, Clock, User
} from 'lucide-react';
import { 
  ExecutiveAnalyticsDashboard, 
  SatisfactionRatingChart, 
  TrialLifecyclePipeline 
} from './analytics';

interface ReportsCenterProps {
  currentUser: UserAccount;
  token: string;
}

// Arabic Dictionaries for Statuses & Priorities
export const MONITORING_STATUS_ARABIC: Record<string, string> = {
  'Customer Satisfied': 'عميل راضي ومستقر',
  'Customer Interested': 'عميل مهتم بالتطوير وشراء إضافات',
  'Needs Follow-up': 'يحتاج لمتابعة تليفونية إضافية',
  'Complaint Opened': 'شكوى مفتوحة (إدارية أو مالية)',
  'Technical Issue Reported': 'بلاغ بمشكلة تقنية',
  'Customer Unsatisfied': 'عميل غير راضي',
  'Customer Not Interested': 'عميل غير مهتم'
};

export const SUPPORT_STATUS_ARABIC: Record<string, string> = {
  'New': 'جديدة (بانتظار البدء)',
  'In Progress': 'قيد المعالجة والتنفيذ',
  'Waiting Customer Response': 'بانتظار رد العميل',
  'Completed': 'مكتملة ومغلقة',
  'Cancelled': 'ملغاة'
};

export const SUPPORT_PRIORITY_ARABIC: Record<string, string> = {
  'Urgent': 'عاجل جداً (أولوية قصوى)',
  'High': 'مرتفع',
  'Medium': 'متوسط',
  'Low': 'عادي'
};

export default function ReportsCenter({ 
  currentUser, 
  token 
}: ReportsCenterProps) {
  const [activeReportTab, setActiveReportTab] = useState<'executive' | 'support' | 'monitoring'>(
    currentUser?.role === 'TechnicalSupport' ? 'support' : 
    currentUser?.role === 'Monitoring' ? 'monitoring' : 'executive'
  );
  const [supportData, setSupportData] = useState<any>(null);
  const [supportTasks, setSupportTasks] = useState<SupportTask[]>([]);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [monitoringRecords, setMonitoringRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Monitoring Detailed Report Filters
  const [mSearchQuery, setMSearchQuery] = useState<string>('');
  const [mStatusFilter, setMStatusFilter] = useState<string>('all');
  const [mEmployeeFilter, setMEmployeeFilter] = useState<string>('all');
  const [mSatisfactionFilter, setMSatisfactionFilter] = useState<string>('all');

  // Support Detailed Report Filters
  const [sSearchQuery, setSSearchQuery] = useState<string>('');
  const [sStatusFilter, setSStatusFilter] = useState<string>('all');
  const [sEngineerFilter, setSEngineerFilter] = useState<string>('all');
  const [sPriorityFilter, setSPriorityFilter] = useState<string>('all');
  const [sTypeFilter, setSTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (currentUser?.role === 'TechnicalSupport') {
      setActiveReportTab('support');
    } else if (currentUser?.role === 'Monitoring') {
      setActiveReportTab('monitoring');
    }
  }, [currentUser]);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Support Reports KPI metrics
      const resSupport = await fetch('/api/reports/support', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataSupport = await resSupport.json();
      if (dataSupport.status === 'success') {
        setSupportData(dataSupport.metrics);
      }

      // Fetch Support Tasks list for the detailed report table
      const resTasks = await fetch('/api/support/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataTasks = await resTasks.json();
      if (dataTasks.status === 'success') {
        setSupportTasks(dataTasks.tasks || []);
      }

      // Fetch Monitoring Reports KPI metrics
      const resMonitoring = await fetch('/api/reports/monitoring', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataMonitoring = await resMonitoring.json();
      if (dataMonitoring.status === 'success') {
        setMonitoringData(dataMonitoring.metrics);
      }

      // Fetch Detailed Monitoring Records
      const resRecords = await fetch('/api/monitoring/records', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataRecords = await resRecords.json();
      if (dataRecords.status === 'success') {
        setMonitoringRecords(dataRecords.records || []);
      }
    } catch (err) {
      setError('خطأ في تحميل وتوليد التقارير والمؤشرات العامة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [token]);

  // Visual Colors Palette
  const COLOR_PALETTE = ['#0d9488', '#f59e0b', '#3b82f6', '#ef4444', '#6366f1', '#a855f7'];

  // Safe data placeholders
  const metrics = supportData || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    activeTrials: 0,
    expiredTrials: 0,
    upcomingExpiry: 0,
    avgCompletionHours: 0,
    employeePerformance: []
  };

  const mMetrics = monitoringData || {
    totalCalls: 0,
    avgSatisfaction: 0,
    satisfactionBreakdown: [0, 0, 0, 0, 0],
    statusBreakdown: [],
    employeeActivity: [],
    activeComplaints: 0,
    technicalIssuesReported: 0
  };

  // Export Monitoring records to CSV (in Arabic)
  const handleExportMonitoringToCSV = (filteredRecs: any[]) => {
    const headers = [
      'اسم العميل',
      'اسم موظف الجودة',
      'نتيجة المكالمة والتواصل',
      'مستوى الرضى (من 5)',
      'تصنيف وحالة المتابعة',
      'تاريخ المتابعة القادمة',
      'الملاحظات والشكاوى',
      'التوصيات والمقترحات',
      'تاريخ التسجيل'
    ];

    const rows = filteredRecs.map(r => [
      r.customerName || '',
      r.employeeName || '',
      r.callResult || '',
      r.customerSatisfactionLevel || '',
      MONITORING_STATUS_ARABIC[r.status] || r.status || '',
      r.nextFollowUpDate || '',
      r.notes || '',
      r.recommendations || '',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : ''
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_المتابعة_والجودة_التفصيلي_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Support Tasks to CSV (in Arabic)
  const handleExportSupportToCSV = (filteredTasks: SupportTask[]) => {
    const headers = [
      'معرف المهمة',
      'اسم العميل',
      'اسم المهندس المكلف',
      'نوع المهمة',
      'الأولوية',
      'الحالة الحالية',
      'تاريخ الإنشاء',
      'تاريخ الإنجاز',
      'تفاصيل المشكلة والطلب',
      'ملاحظات الحل والإغلاق'
    ];

    const rows = filteredTasks.map(t => [
      t.id || '',
      t.customerName || '',
      t.assignedEmployeeName || '',
      t.taskType || '',
      SUPPORT_PRIORITY_ARABIC[t.priority] || t.priority || '',
      SUPPORT_STATUS_ARABIC[t.status] || t.status || '',
      t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : '',
      t.completedAt ? new Date(t.completedAt).toLocaleDateString('ar-EG') : 'لم تكتمل بعد',
      t.description || '',
      t.resolutionNotes || ''
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_الدعم_الفني_التفصيلي_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unique list of monitoring values for filters
  const uniqueMonitoringEmployees = Array.from(new Set(monitoringRecords.map(r => r.employeeName).filter(Boolean))) as string[];
  const uniqueMonitoringStatuses = Array.from(new Set(monitoringRecords.map(r => r.status).filter(Boolean))) as string[];

  // Filtered monitoring records
  const filteredMonitoringRecords = useMemo(() => {
    return monitoringRecords.filter(rec => {
      const matchesSearch = !mSearchQuery || 
        (rec.customerName || '').toLowerCase().includes(mSearchQuery.toLowerCase()) ||
        (rec.callResult || '').toLowerCase().includes(mSearchQuery.toLowerCase()) ||
        (rec.notes || '').toLowerCase().includes(mSearchQuery.toLowerCase()) ||
        (rec.recommendations || '').toLowerCase().includes(mSearchQuery.toLowerCase());

      const matchesStatus = mStatusFilter === 'all' || rec.status === mStatusFilter;
      const matchesEmployee = mEmployeeFilter === 'all' || rec.employeeName === mEmployeeFilter;
      const matchesSatisfaction = mSatisfactionFilter === 'all' || String(rec.customerSatisfactionLevel) === mSatisfactionFilter;

      return matchesSearch && matchesStatus && matchesEmployee && matchesSatisfaction;
    });
  }, [monitoringRecords, mSearchQuery, mStatusFilter, mEmployeeFilter, mSatisfactionFilter]);

  // Unique list of Support values for filters
  const uniqueSupportEngineers = Array.from(new Set(supportTasks.map(t => t.assignedEmployeeName).filter(Boolean)));
  const uniqueSupportTypes = Array.from(new Set(supportTasks.map(t => t.taskType).filter(Boolean)));
  const uniqueSupportStatuses = Array.from(new Set(supportTasks.map(t => t.status).filter(Boolean)));

  // Filtered support tasks
  const filteredSupportTasks = useMemo(() => {
    return supportTasks.filter(task => {
      const matchesSearch = !sSearchQuery ||
        (task.customerName || '').toLowerCase().includes(sSearchQuery.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(sSearchQuery.toLowerCase()) ||
        (task.resolutionNotes || '').toLowerCase().includes(sSearchQuery.toLowerCase()) ||
        (task.assignedEmployeeName || '').toLowerCase().includes(sSearchQuery.toLowerCase());

      const matchesStatus = sStatusFilter === 'all' || task.status === sStatusFilter;
      const matchesEngineer = sEngineerFilter === 'all' || task.assignedEmployeeName === sEngineerFilter;
      const matchesPriority = sPriorityFilter === 'all' || task.priority === sPriorityFilter;
      const matchesType = sTypeFilter === 'all' || task.taskType === sTypeFilter;

      return matchesSearch && matchesStatus && matchesEngineer && matchesPriority && matchesType;
    });
  }, [supportTasks, sSearchQuery, sStatusFilter, sEngineerFilter, sPriorityFilter, sTypeFilter]);

  // Support status Pie chart data
  const supportStatusPieData = [
    { name: 'مكتملة ومغلقة', value: metrics.completedTasks, color: '#0d9488' },
    { name: 'قيد التنفيذ والمتابعة', value: metrics.pendingTasks, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // CSAT Rating Breakdown data
  const satisfactionPieData = [
    { name: '⭐⭐⭐⭐⭐ ممتاز', value: mMetrics.satisfactionBreakdown[4] || 0, color: '#10b981' },
    { name: '⭐⭐⭐⭐ جيد جداً', value: mMetrics.satisfactionBreakdown[3] || 0, color: '#06b6d4' },
    { name: '⭐⭐⭐ متوسط', value: mMetrics.satisfactionBreakdown[2] || 0, color: '#f59e0b' },
    { name: '⭐⭐ ضعيف', value: mMetrics.satisfactionBreakdown[1] || 0, color: '#f97316' },
    { name: '⭐ سيء', value: mMetrics.satisfactionBreakdown[0] || 0, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6" id="reports-center">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BarChart4 className="w-6 h-6 text-teal-600" />
            <span>لوحة المؤشرات والتقارير التفصيلية الشاملة</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تقارير حية وإحصاءات تفصيلية ترصد أداء قسمي الدعم الفني والمتابعة والجودة مع إمكانية التصفية والتصدير المباشر
          </p>
        </div>

        {/* Reload button */}
        <button
          onClick={fetchReportData}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer border border-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* Sub-Tabs */}
      {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/50 w-fit">
          <button
            onClick={() => setActiveReportTab('executive')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeReportTab === 'executive' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            لوحة القيادة التنفيذية (KPIs)
          </button>
          <button
            onClick={() => setActiveReportTab('support')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeReportTab === 'support' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-teal-700'
            }`}
          >
            تقارير الدعم الفني وتراخيص النسخ
          </button>
          <button
            onClick={() => setActiveReportTab('monitoring')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeReportTab === 'monitoring' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-700'
            }`}
          >
            تقارير الجودة ومستويات الرضى (CSAT)
          </button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchReportData} className="underline text-[11px] hover:text-rose-900 cursor-pointer">
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {loading ? (
        <div className="bg-slate-50/70 p-12 rounded-2xl border border-slate-100 text-center space-y-3 my-4">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">جاري تجميع البيانات وتوليد المخططات البيانية والتقارير الفنية...</p>
        </div>
      ) : (
        <>
          {/* 1. EXECUTIVE KPI DASHBOARD (MODERN THREE-TIER CRM ANALYTICS & DATA STORYTELLING) */}
      {activeReportTab === 'executive' && (
        <ExecutiveAnalyticsDashboard
          metrics={metrics}
          mMetrics={mMetrics}
          statusArabicMap={MONITORING_STATUS_ARABIC}
        />
      )}

      {/* 2. TECHNICAL SUPPORT REPORTS & DETAILED REPORT */}
      {activeReportTab === 'support' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Completion Rates Pie Chart */}
            <div className="p-5 bg-slate-50/30 border border-slate-150 rounded-2xl space-y-4">
              <h4 className="text-xs font-black text-slate-700 text-center">توزيع حالة مهام الدعم الفني</h4>
              
              {supportStatusPieData.length === 0 ? (
                <p className="text-[10px] text-center text-slate-400 py-12">لا توجد مهام دعم مسجلة لعرضها</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={supportStatusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {supportStatusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Performance Bar Chart */}
            <div className="p-5 bg-slate-50/30 border border-slate-150 rounded-2xl space-y-4">
              <h4 className="text-xs font-black text-slate-700 text-center">أداء المهندسين وإجمالي الإنجازات</h4>
              
              {metrics.employeePerformance.length === 0 ? (
                <p className="text-[10px] text-center text-slate-400 py-12">لا يوجد بيانات أداء للمهندسين متوفرة</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.employeePerformance}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="completed" fill="#0d9488" name="مكتملة" />
                      <Bar dataKey="pending" fill="#f59e0b" name="تحت العمل" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Trials lifecycle pipeline view */}
          <TrialLifecyclePipeline
            activeTrials={metrics.activeTrials}
            upcomingExpiry={metrics.upcomingExpiry}
            expiredTrials={metrics.expiredTrials}
          />

          {/* NEW: DETAILED TECHNICAL SUPPORT TASKS REPORT (اضافة تقرير تفصيلي في قسم التقارير لقسم الدعم الفني) */}
          <div className="p-6 bg-white border border-slate-100 rounded-2xl space-y-4 shadow-sm" id="detailed-support-report">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-4">
              <div className="text-right" dir="rtl">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-teal-600 animate-pulse" />
                  <span>التقرير التفصيلي لمهام وبلاغات الدعم الفني (تصفية وتصدير إكسل)</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  سجل كامل ومفصل لجميع طلبات الدعم الفني، التكليفات الميدانية، حل المشكلات وأوقات الإنجاز
                </p>
              </div>

              {/* Excel Export Button */}
              <button
                onClick={() => handleExportSupportToCSV(filteredSupportTasks)}
                disabled={filteredSupportTasks.length === 0}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer select-none"
              >
                <Download className="w-4 h-4" />
                <span>تصدير تقرير الدعم الفني إلى إكسل (Excel)</span>
              </button>
            </div>

            {/* Support Interactive Filters Panel in Pure Arabic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150 text-right" dir="rtl">
              {/* Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">بحث بالعميل أو الوصف أو المهندس</label>
                <input
                  type="text"
                  value={sSearchQuery}
                  onChange={(e) => setSSearchQuery(e.target.value)}
                  placeholder="ابحث هنا..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white placeholder:text-slate-300"
                />
              </div>

              {/* Status Filter (Pure Arabic) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">تصفية بحسب الحالة</label>
                <select
                  value={sStatusFilter}
                  onChange={(e) => setSStatusFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كل الحالات ({supportTasks.length})</option>
                  <option value="New">جديدة (بانتظار البدء)</option>
                  <option value="In Progress">قيد المعالجة والتنفيذ</option>
                  <option value="Waiting Customer Response">بانتظار رد العميل</option>
                  <option value="Completed">مكتملة ومغلقة</option>
                  <option value="Cancelled">ملغاة</option>
                </select>
              </div>

              {/* Engineer Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">المهندس المكلف</label>
                <select
                  value={sEngineerFilter}
                  onChange={(e) => setSEngineerFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كل المهندسين</option>
                  {uniqueSupportEngineers.map(eng => (
                    <option key={eng} value={eng}>{eng}</option>
                  ))}
                </select>
              </div>

              {/* Task Type Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">نوع المهمة</label>
                <select
                  value={sTypeFilter}
                  onChange={(e) => setSTypeFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كل أنواع المهام</option>
                  {uniqueSupportTypes.map(typ => (
                    <option key={typ} value={typ}>{typ}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">مستوى الأولوية</label>
                <select
                  value={sPriorityFilter}
                  onChange={(e) => setSPriorityFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كل المستويات</option>
                  <option value="Urgent">🔴 عاجل جداً</option>
                  <option value="High">🟠 مرتفع</option>
                  <option value="Medium">🔵 متوسط</option>
                  <option value="Low">⚪ عادي</option>
                </select>
              </div>
            </div>

            {/* Results counter */}
            <div className="text-[10px] text-slate-500 font-bold text-right">
              عدد النتائج المكتشفة: {filteredSupportTasks.length} مهمة دعم فني
            </div>

            {/* Detailed Support Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-right text-xs" dir="rtl">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <th className="p-3">اسم العميل</th>
                    <th className="p-3">المهندس المكلف</th>
                    <th className="p-3">نوع المهمة</th>
                    <th className="p-3 text-center">الأولوية</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3">تاريخ الطلب</th>
                    <th className="p-3">تاريخ الإنجاز</th>
                    <th className="p-3">تفاصيل المشكلة والحل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSupportTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                        لا توجد مهام دعم فني تطابق معايير البحث المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredSupportTasks.map((task: SupportTask) => (
                      <tr key={task.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{task.customerName}</td>
                        <td className="p-3 text-teal-700 font-bold">{task.assignedEmployeeName || 'غير معين'}</td>
                        <td className="p-3 text-slate-600 font-medium">{task.taskType}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            task.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                            task.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                            task.priority === 'Medium' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {SUPPORT_PRIORITY_ARABIC[task.priority] || task.priority}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            task.status === 'Cancelled' ? 'bg-slate-100 text-slate-600' :
                            'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {SUPPORT_STATUS_ARABIC[task.status] || task.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[10px]">
                          {task.createdAt ? new Date(task.createdAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric'
                          }) : '-'}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[10px]">
                          {task.completedAt ? (
                            <span className="text-emerald-700 font-bold">
                              {new Date(task.completedAt).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric'
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400">قيد المعالجة</span>
                          )}
                        </td>
                        <td className="p-3 max-w-xs leading-relaxed text-[11px] text-slate-600 font-medium">
                          <div className="text-slate-800 line-clamp-2">{task.description}</div>
                          {task.resolutionNotes && (
                            <div className="text-emerald-700 bg-emerald-50 p-1.5 rounded mt-1 border border-emerald-100 text-[10px]">
                              حل المشكلة: {task.resolutionNotes}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONITORING & QUALITY REPORTS & DETAILED REPORT */}
      {activeReportTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Satisfaction Deep Dive Component */}
            <div className="lg:col-span-6">
              <SatisfactionRatingChart
                avgSatisfaction={mMetrics.avgSatisfaction}
                satisfactionBreakdown={mMetrics.satisfactionBreakdown}
                totalCalls={mMetrics.totalCalls}
                activeComplaints={mMetrics.activeComplaints}
                className="h-full"
              />
            </div>

            {/* Status Breakdown Bar Chart */}
            <div className="lg:col-span-6 p-6 bg-white border border-slate-200/80 rounded-2xl space-y-4 shadow-xs hover:shadow-md transition-all">
              <h4 className="text-sm font-black text-slate-800 text-right pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>تصنيفات ومخرجات مكالمات المتابعة</span>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {mMetrics.totalCalls} اتصال
                </span>
              </h4>
              {mMetrics.statusBreakdown.length === 0 ? (
                <p className="text-[10px] text-center text-slate-400 py-12">لا توجد سجلات مكالمات لعرضها</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mMetrics.statusBreakdown.map((s: any) => ({
                        ...s,
                        statusArabic: MONITORING_STATUS_ARABIC[s.status] || s.status
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="statusArabic" type="category" width={140} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} name="عدد المتابعات" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Employee Monitoring Activity */}
          <div className="p-5 bg-white border border-slate-100 rounded-2xl">
            <h4 className="text-xs font-black text-slate-700 mb-4">إنتاجية ونشاط موظفي المتابعة والجودة</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <th className="p-3">اسم موظف الجودة</th>
                    <th className="p-3 text-center">المتابعات الهاتفية المنفذة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mMetrics.employeeActivity.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-slate-400">لا يوجد إحصائيات نشاط لموظفي المتابعة حالياً</td>
                    </tr>
                  ) : (
                    mMetrics.employeeActivity.map((emp: any) => (
                      <tr key={emp.name} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">{emp.name}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-700">{emp.calls} متابعة تليفونية</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Quality & Follow-up Logs Report in Pure Arabic */}
          <div className="p-6 bg-white border border-slate-100 rounded-2xl space-y-4 shadow-sm" id="detailed-quality-report">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-4">
              <div className="text-right" dir="rtl">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <span>التقرير التفصيلي لسجلات المتابعة والجودة (تصدير وتصفية باللغة العربية)</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  عرض تفصيلي لجميع مكالمات المتابعة، مستويات الرضى، الشكاوى والحلول المسجلة للعملاء
                </p>
              </div>

              {/* Excel Export Button */}
              <button
                onClick={() => handleExportMonitoringToCSV(filteredMonitoringRecords)}
                disabled={filteredMonitoringRecords.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer select-none"
              >
                <Download className="w-4 h-4" />
                <span>تصدير التقرير إلى إكسل (Excel)</span>
              </button>
            </div>

            {/* Interactive Filters Panel (All in Arabic) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150 text-right" dir="rtl">
              {/* Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">بحث سريع (العميل، النتيجة، الملاحظات)</label>
                <input
                  type="text"
                  value={mSearchQuery}
                  onChange={(e) => setMSearchQuery(e.target.value)}
                  placeholder="ابحث هنا..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white placeholder:text-slate-300"
                />
              </div>

              {/* Status Filter (Pure Arabic) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">تصفية بحسب النتيجة والتصنيف</label>
                <select
                  value={mStatusFilter}
                  onChange={(e) => setMStatusFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كل الحالات والتصنيفات ({monitoringRecords.length})</option>
                  {uniqueMonitoringStatuses.map(st => (
                    <option key={st} value={st}>
                      {MONITORING_STATUS_ARABIC[st] || st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">موظف المتابعة والجودة</label>
                <select
                  value={mEmployeeFilter}
                  onChange={(e) => setMEmployeeFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كل الموظفين</option>
                  {uniqueMonitoringEmployees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Satisfaction Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">مستوى الرضى (النجوم)</label>
                <select
                  value={mSatisfactionFilter}
                  onChange={(e) => setMSatisfactionFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كل مستويات الرضى</option>
                  <option value="5">⭐⭐⭐⭐⭐ ممتاز (5 نجوم)</option>
                  <option value="4">⭐⭐⭐⭐ جيد جداً (4 نجوم)</option>
                  <option value="3">⭐⭐⭐ متوسط (3 نجوم)</option>
                  <option value="2">⭐⭐ ضعيف (نجمتان)</option>
                  <option value="1">⭐ غير راضي (نجمة واحدة)</option>
                </select>
              </div>
            </div>

            {/* Results counter */}
            <div className="text-[10px] text-slate-500 font-bold text-right">
              عدد النتائج المكتشفة: {filteredMonitoringRecords.length} سجل متابعة
            </div>

            {/* Detailed Table (Pure Arabic) */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-right text-xs" dir="rtl">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <th className="p-3">اسم العميل</th>
                    <th className="p-3">موظف المتابعة</th>
                    <th className="p-3">تاريخ التسجيل</th>
                    <th className="p-3 text-center">التصنيف والحالة</th>
                    <th className="p-3 text-center">مستوى الرضى</th>
                    <th className="p-3">خلاصة المكالمة والشكاوى</th>
                    <th className="p-3">التوصيات والمتابعة القادمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMonitoringRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                        لا توجد سجلات متابعة تطابق معايير البحث المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredMonitoringRecords.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{rec.customerName}</td>
                        <td className="p-3 text-slate-600 font-medium">{rec.employeeName}</td>
                        <td className="p-3 text-slate-500 font-mono text-[10px]">
                          {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : ''}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            rec.status === 'Customer Satisfied' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            rec.status === 'Complaint Opened' ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' :
                            rec.status === 'Technical Issue Reported' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            rec.status === 'Needs Follow-up' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {MONITORING_STATUS_ARABIC[rec.status] || rec.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-0.5 text-amber-400 font-bold font-mono">
                            {Array.from({ length: rec.customerSatisfactionLevel || 0 }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                            {!(rec.customerSatisfactionLevel) && <span className="text-slate-300">-</span>}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs leading-relaxed text-[11px] text-slate-600 font-medium text-right font-sans">
                          <div className="font-bold text-slate-800">{rec.callResult}</div>
                          {rec.notes && <div className="text-slate-500 mt-1 whitespace-pre-line">{rec.notes}</div>}
                          {rec.issuesReported && (
                            <div className="mt-1 p-1 bg-rose-50 text-rose-700 rounded border border-rose-100 text-[10px]">
                              الشكوى: {rec.issuesReported}
                            </div>
                          )}
                        </td>
                        <td className="p-3 max-w-xs leading-relaxed text-[11px] text-slate-600 font-medium text-right font-sans">
                          {rec.recommendations && (
                            <div className="text-indigo-600 font-bold bg-indigo-50/40 p-1.5 rounded-lg border border-indigo-50 mb-1">
                              💡 {rec.recommendations}
                            </div>
                          )}
                          {rec.nextFollowUpDate && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                              <span>📅 المتابعة القادمة:</span>
                              <strong>{rec.nextFollowUpDate}</strong>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </>
      )}

    </div>
  );
}
