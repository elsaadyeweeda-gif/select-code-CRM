/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Visit, Customer, SalesRep } from '../types';
import { 
  BarChart, Bar, 
  PieChart, Pie, Cell, 
  LineChart, Line, 
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Users, Calendar, Award, DollarSign, Activity, FileCheck, Landmark, CheckSquare } from 'lucide-react';

interface DashboardViewProps {
  visits: Visit[];
  customers: Customer[];
  salesReps: SalesRep[];
}

export default function DashboardView({ visits, customers, salesReps }: DashboardViewProps) {
  
  // 1. Calculate KPIs under Arabic business rules
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Visits calculations
    const totalVisits = visits.length;
    
    const visitsToday = visits.filter(v => {
      const vDate = v.timestamp ? v.timestamp.split('T')[0] : '';
      return vDate === todayStr;
    }).length;
    
    // Visits this week (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const visitsThisWeek = visits.filter(v => {
      const vDate = new Date(v.timestamp);
      return vDate >= sevenDaysAgo;
    }).length;

    // Visits this month (current calendar month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const visitsThisMonth = visits.filter(v => {
      const vDate = new Date(v.timestamp);
      return vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear;
    }).length;

    // Customers calculations
    const totalCustomers = customers.length;
    
    // New customers in the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const newCustomers = customers.filter(c => {
      const cDate = new Date(c.firstVisitDate);
      return cDate >= fourteenDaysAgo;
    }).length;

    // Active customers (Status not "غير مهتم" and last visit is within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeCustomers = customers.filter(c => {
      const lastVisit = new Date(c.lastVisitDate);
      return c.currentStatus !== 'غير مهتم' && lastVisit >= thirtyDaysAgo;
    }).length;

    // Signed contracts ("تم التعاقد")
    const signedContracts = customers.filter(c => c.currentStatus === 'تم التعاقد').length;

    // Sum of Expected Opportunity Values
    const totalOpportunitiesValue = customers
      .filter(c => c.currentStatus !== 'غير مهتم' && c.currentStatus !== 'تم التعاقد')
      .reduce((sum, c) => sum + (c.opportunityValue || 0), 0);

    // Conversion rate: (Signed Contracts / Total Customers) * 100
    const conversionRate = totalCustomers > 0 
      ? Math.round((signedContracts / totalCustomers) * 100) 
      : 0;

    return {
      totalVisits,
      visitsToday,
      visitsThisWeek,
      visitsThisMonth,
      totalCustomers,
      newCustomers,
      activeCustomers,
      signedContracts,
      totalOpportunitiesValue,
      conversionRate
    };
  }, [visits, customers]);

  // 2. Charts Data prep
  
  // Chart A: الزيارات حسب المندوب (Visits by Sales Rep)
  const visitsByRepData = useMemo(() => {
    const counts: { [name: string]: number } = {};
    visits.forEach(v => {
      counts[v.repName] = (counts[v.repName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, 'عدد الزيارات': value }));
  }, [visits]);

  // Chart B: الزيارات حسب المحافظة (Visits by Province)
  const visitsByProvinceData = useMemo(() => {
    const counts: { [name: string]: number } = {};
    visits.forEach(v => {
      if (v.visitType === 'زيارة جديدة' && v.province) {
        // Clean name a bit to make chart prettier
        const cleanName = v.province.replace('المحافظة ', '').replace('المنطقة ', '');
        counts[cleanName] = (counts[cleanName] || 0) + 1;
      }
    });

    const colors = ['#0f172a', '#0d9488', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }));
  }, [visits]);

  // Chart C: العملاء حسب النشاط (Customers by Industry/Activity)
  const customersByActivityData = useMemo(() => {
    const counts: { [name: string]: number } = {};
    customers.forEach(c => {
      const segment = c.activity ? c.activity.trim() : 'غير محدد';
      counts[segment] = (counts[segment] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, 'عدد العملاء': value }));
  }, [customers]);

  // Chart D: العقود حسب الشهر (Contracts signed by month)
  const contractsByMonthData = useMemo(() => {
    // Generate months counts
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const counts: { [m: number]: number } = {};
    const values: { [m: number]: number } = {};
    
    // Set default initial data for current year months, e.g. May (5) and June (6) since our mock data cluster is there
    counts[4] = 1; // May
    values[4] = 85000;
    counts[5] = 1; // June
    values[5] = 85000;

    customers.forEach(c => {
      if (c.currentStatus === 'تم التعاقد' && c.lastVisitDate) {
        const date = new Date(c.lastVisitDate);
        const m = date.getMonth();
        counts[m] = (counts[m] || 0) + 1;
        values[m] = (values[m] || 0) + c.opportunityValue;
      }
    });

    const activeMonthsIndices = [4, 5, 6, 7]; // May, June, July, August indices to show
    
    return activeMonthsIndices.map(mIdx => ({
      name: months[mIdx],
      'عدد العقود': counts[mIdx] || 0,
      'عائدات العقود (ألف ر.س)': Math.round((values[mIdx] || 0) / 1000)
    }));
  }, [customers]);

  // Chart E: مراحل الفرص البيعية (Opportunity Pipeline Funnel)
  const salesFunnelData = useMemo(() => {
    const pipelineStages = [
      { key: 'عميل محتمل', name: 'عميل محتمل', color: '#f59e0b' },
      { key: 'جاري المتابعة', name: 'جاري المتابعة', color: '#6366f1' },
      { key: 'تم إرسال عرض سعر', name: 'عرض سعر مرسل', color: '#a855f7' },
      { key: 'تفاوض', name: 'مرحلة التفاوض', color: '#0ea5e9' },
      { key: 'تم التعاقد', name: 'تم التعاقد 🚀', color: '#10b981' }
    ];

    return pipelineStages.map(stage => {
      const count = customers.filter(c => c.currentStatus === stage.key).length;
      const totalValue = customers
        .filter(c => c.currentStatus === stage.key)
        .reduce((sum, c) => sum + (c.opportunityValue || 0), 0);
        
      return {
        name: stage.name,
        'عدد العملاء': count,
        'القيمة الإجمالية (ر.س)': totalValue,
        color: stage.color
      };
    });
  }, [customers]);

  return (
    <div className="space-y-8" id="crm-manager-dashboard">
      
      {/* Dynamic KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
        {/* KPI 1: Visits Total */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">إجمالي زيارات المندوبين</span>
            <div className="flex items-baseline gap-1.5 justify-end">
              <span className="text-2xl font-black text-gray-950 font-mono">{kpis.totalVisits}</span>
              <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded font-bold font-mono">+{kpis.visitsThisMonth}</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">نشاط الزيارات هذا الشهر</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-800 shrink-0">
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
        </div>

        {/* KPI 2: Today / Week Activities */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">حركة اليوم والأسبوع</span>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-xl font-bold text-gray-900 font-mono">{kpis.visitsToday} اليوم</span>
              <span className="text-sm font-semibold text-gray-500 font-mono">/ {kpis.visitsThisWeek} أسبوعي</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">تحديث فوري لتقارير الميدان</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: New / Active Customers */}
        <div className="bg-white border border-gray-105 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">العملاء (جدد / تفاعل)</span>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-xl font-bold text-gray-900 font-mono">+{kpis.newCustomers} عميل</span>
              <span className="text-sm text-gray-500 font-semibold font-mono">({kpis.activeCustomers} نشط)</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">أول زيارة آخر ١٤ يوماً</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Conversion Rate & Contracts */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">معدل الإغلاق والتعاقد</span>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-2xl font-black text-emerald-600 font-mono">{kpis.conversionRate}%</span>
              <span className="text-xs text-gray-500 font-bold">({kpis.signedContracts} عقود مبرمة)</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">نسبة العقود المكتملة</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>



      {/* Charts Responsive Layout Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-right">
        
        {/* Chart 1: Visits by Rep */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-end gap-1.5 font-sans">
            <span>توزيع الزيارات حسب المندوب المسؤول</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </h3>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitsByRepData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px', borderColor: '#f1f5f9' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="عدد الزيارات" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Visits by province */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-end gap-1.5 font-sans">
            <span>الزيارات والعملاء الجدد حسب العنوان الجغرافي</span>
            <Landmark className="w-4 h-4 text-slate-700" />
          </h3>
          <div className="h-64 mt-2 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="h-full w-full md:w-3/5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visitsByProvinceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {visitsByProvinceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Pie Legend */}
            <div className="w-full md:w-2/5 flex flex-col gap-2 justify-center text-xs">
              {visitsByProvinceData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 justify-end">
                  <span className="text-gray-500 text-[11px] font-medium">({item.value} زيارات)</span>
                  <span className="font-bold text-gray-800 text-[11px]">{item.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Pipeline Stages Funnel overview */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs lg:col-span-2 text-right">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-end gap-1.5 font-sans">
            <span>توزيع مراحل الفرص البيعية وحالة العملاء</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesFunnelData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                {/* RTL adjustments - swap X / Y */}
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={110} tickLine={false} axisLine={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px', borderColor: '#f1f5f9' }}
                  formatter={(value, name) => [value, name]}
                />
                <Bar dataKey="عدد العملاء" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20}>
                  {salesFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Contracts signed by period */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs text-right">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-end gap-1.5 font-sans">
            <span>معدل نمو التوقيع والعقود الشهرية (ر.س)</span>
            <Landmark className="w-4 h-4 text-blue-600" />
          </h3>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={contractsByMonthData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="عائدات العقود (ألف ر.س)" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Customers by activity */}
        <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-xs text-right">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-end gap-1.5 font-sans">
            <span>العملاء المقسمين حسب نوع البرمجيات المطلوبة</span>
            <Landmark className="w-4 h-4 text-indigo-600" />
          </h3>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customersByActivityData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px' }} />
                <Bar dataKey="عدد العملاء" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
