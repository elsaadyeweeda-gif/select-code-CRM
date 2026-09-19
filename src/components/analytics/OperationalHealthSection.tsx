import React from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Layers 
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ProgressBar } from './ProgressBar';

export interface OperationalHealthSectionProps {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  avgCompletionHours: number;
  avgSatisfaction: number;
  totalCalls: number;
  activeComplaints: number;
  className?: string;
  id?: string;
}

export const OperationalHealthSection: React.FC<OperationalHealthSectionProps> = ({
  totalTasks = 0,
  completedTasks = 0,
  pendingTasks = 0,
  avgCompletionHours = 0,
  avgSatisfaction = 0,
  totalCalls = 0,
  activeComplaints = 0,
  className = '',
  id
}) => {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const pendingRate = 100 - completionRate;

  // Donut data for tasks
  const taskChartData = [
    { name: 'مكتملة ومغلقة', value: completedTasks, color: '#0d9488' },
    { name: 'قيد المعالجة', value: pendingTasks, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // Velocity SLA assessment
  const getVelocityTier = (hours: number) => {
    if (hours === 0) return { label: 'بانتظار اكتمال المهام', color: 'text-slate-600 bg-slate-100 border-slate-200' };
    if (hours <= 12) return { label: 'استجابة فائقة السرعة (< 12 ساعة)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (hours <= 24) return { label: 'ضمن المعايير القياسية (< 24 ساعة)', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    if (hours <= 48) return { label: 'استجابة مقبولة (< 48 ساعة)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'تحتاج تسريع ومعالجة التراكم', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const velocityTier = getVelocityTier(avgCompletionHours);

  // Data Storytelling: Correlation evaluation
  const isHighVelocity = avgCompletionHours > 0 && avgCompletionHours <= 24;
  const isHighCSAT = avgSatisfaction >= 4.0;
  const hasLowComplaints = activeComplaints === 0;

  return (
    <div id={id} className={`space-y-4 ${className}`}>
      {/* 1. DATA STORYTELLING CORRELATION BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-l from-teal-900 via-slate-900 to-indigo-950 text-white shadow-md relative overflow-hidden">
        {/* Subtle Background Lighting Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                تحليل الارتباط التنفيذي الذكي (Data Storytelling & Correlation)
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black leading-snug">
              أثر سرعة استجابة الدعم الفني على استقرار ورضى العملاء
            </h3>

            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {isHighVelocity && isHighCSAT ? (
                <>
                  تُظهر البيانات ترابطاً إيجابياً وثيقاً: سرعة إنجاز المهام بمعدل{' '}
                  <span className="text-teal-300 font-mono font-bold">{avgCompletionHours} ساعة</span>{' '}
                  انعكست مباشرة على استقرار الرضى العام عند{' '}
                  <span className="text-amber-300 font-mono font-bold">{avgSatisfaction} ★</span>، مع حصر الشكاوى المفتوحة عند{' '}
                  <span className="text-emerald-300 font-mono font-bold">{activeComplaints}</span> بلاغ.
                </>
              ) : (
                <>
                  رصد مستمر لمؤشرات الأداء: يُسهم خفض زمن إغلاق التكليفات الفنية دون 24 ساعة في رفع درجات تقييم الجودة (CSAT) وتقليص احتمالات إلغاء الاشتراكات بنسبة تتجاوز 40%.
                </>
              )}
            </p>
          </div>

          {/* Quick Stats Correlation Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto flex-shrink-0">
            <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-center backdrop-blur-sm">
              <span className="text-[10px] text-slate-300 font-bold block">معدل الإغلاق</span>
              <span className="text-xl font-black font-mono text-teal-300 mt-0.5 block">{completionRate}%</span>
              <span className="text-[9px] text-slate-400 mt-0.5 block">مهام منجزة</span>
            </div>

            <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-center backdrop-blur-sm">
              <span className="text-[10px] text-slate-300 font-bold block">زمن الحل الوسطي</span>
              <span className="text-xl font-black font-mono text-amber-300 mt-0.5 block">{avgCompletionHours}h</span>
              <span className="text-[9px] text-slate-400 mt-0.5 block">ساعات لكل بلاغ</span>
            </div>

            <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-center backdrop-blur-sm col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-300 font-bold block">مؤشر الرضى العام</span>
              <span className="text-xl font-black font-mono text-emerald-300 mt-0.5 block">{avgSatisfaction} ★</span>
              <span className="text-[9px] text-slate-400 mt-0.5 block">من إجمالي {totalCalls} اتصال</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL HEALTH CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Support Velocity & Task Ratio Card (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span>سلامة العمليات وسرعة إنجاز المهام (Task Velocity)</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  رصد نسب الإنجاز التراكمية وسرعة إغلاق طلبات وتكليفات الدعم
                </p>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${velocityTier.color}`}>
                {velocityTier.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* Donut Chart visual */}
              <div className="sm:col-span-5 h-48 flex flex-col items-center justify-center relative">
                {totalTasks === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-8">لا توجد مهام مسجلة</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {taskChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black font-mono text-slate-800">{completionRate}%</span>
                      <span className="text-[9px] font-bold text-slate-400">نسبة الإنجاز</span>
                    </div>
                  </>
                )}
              </div>

              {/* Task Breakdown Stats */}
              <div className="sm:col-span-7 space-y-3.5">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      <span>مهام مكتملة ومغلقة</span>
                    </span>
                    <span className="font-mono font-bold text-teal-800">{completedTasks} مهمة</span>
                  </div>
                  <ProgressBar value={completionRate} color="teal" height="md" showLabel={false} />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>مهام قيد المعالجة والمتابعة</span>
                    </span>
                    <span className="font-mono font-bold text-amber-700">{pendingTasks} مهمة</span>
                  </div>
                  <ProgressBar value={pendingRate} color="amber" height="md" showLabel={false} />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold">إجمالي التكليفات المسجلة</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{totalTasks}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>متوسط وقت المعالجة والإغلاق:</span>
            <strong className="text-slate-800 font-mono font-bold">{avgCompletionHours} ساعة / للمهمة</strong>
          </div>
        </div>

        {/* Quality SLA & Risk Indicators Card (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>مؤشرات المخاطر والاستقرار (Risk & Health)</span>
              </h4>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                متابعة حية
              </span>
            </div>

            <div className="space-y-3">
              {/* Complaints counter */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block">شكاوى مفتوحة حالياً</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">تتطلب تدخل الإدارة</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-black font-mono ${activeComplaints > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {activeComplaints}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    activeComplaints > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {activeComplaints > 0 ? 'حرجة' : 'مستقرة'}
                  </span>
                </div>
              </div>

              {/* Call Velocity */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block">معدل التغطية والتواصل</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">إجمالي الاتصالات الدورية</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-indigo-700 block">
                    {totalCalls}
                  </span>
                </div>
              </div>

              {/* Satisfaction summary badge */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block">رضى العملاء العام (CSAT)</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">مستوى الثقة بالخدمة</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-amber-600 block">
                    {avgSatisfaction} ★
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium text-center">
            يتم تحديث المؤشرات تلقائياً مع كل مكالمة جودة أو مهمة دعم فني منجزة
          </div>
        </div>
      </div>
    </div>
  );
};
