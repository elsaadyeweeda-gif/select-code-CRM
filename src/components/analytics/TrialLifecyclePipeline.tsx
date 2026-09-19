import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export interface TrialLifecyclePipelineProps {
  activeTrials: number;
  upcomingExpiry: number;
  expiredTrials: number;
  className?: string;
  id?: string;
}

export const TrialLifecyclePipeline: React.FC<TrialLifecyclePipelineProps> = ({
  activeTrials = 0,
  upcomingExpiry = 0,
  expiredTrials = 0,
  className = '',
  id
}) => {
  const totalTrials = activeTrials + expiredTrials;
  const activeRate = totalTrials > 0 ? Math.round((activeTrials / totalTrials) * 100) : 0;
  const expiredRate = totalTrials > 0 ? Math.round((expiredTrials / totalTrials) * 100) : 0;

  // Proportion of active trials that are expiring soon
  const atRiskRate = activeTrials > 0 ? Math.round((upcomingExpiry / activeTrials) * 100) : 0;

  return (
    <div
      id={id}
      className={`bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <span>مسار ومراحل التراخيص التجريبية (Trial Lifecycle Pipeline)</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            رصد تدفق النسخ التجريبية وفرص تحويل العملاء قبل انتهاء الفترة المحددة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            إجمالي النسخ: {totalTrials}
          </span>
        </div>
      </div>

      {totalTrials === 0 ? (
        <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-slate-100 space-y-2">
          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 font-bold">لا توجد تراخيص تجريبية مسجلة حالياً</p>
          <p className="text-[11px] text-slate-400">ستظهر المراحل فور تفعيل نسخ تجريبية للعملاء</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Visual Lifecycle Pipeline Track */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                نشطة مستقرة ({activeTrials - upcomingExpiry})
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                تنتهي قريباً ({upcomingExpiry})
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                منتهية ({expiredTrials})
              </span>
            </div>

            {/* Segmented Pipeline Bar */}
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              {activeTrials - upcomingExpiry > 0 && (
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${((activeTrials - upcomingExpiry) / totalTrials) * 100}%`
                  }}
                  title={`نشطة ومستقرة: ${activeTrials - upcomingExpiry}`}
                />
              )}
              {upcomingExpiry > 0 && (
                <div
                  className="bg-amber-400 transition-all duration-500"
                  style={{
                    width: `${(upcomingExpiry / totalTrials) * 100}%`
                  }}
                  title={`أوشكت على الانتهاء: ${upcomingExpiry}`}
                />
              )}
              {expiredTrials > 0 && (
                <div
                  className="bg-rose-400 transition-all duration-500"
                  style={{
                    width: `${(expiredTrials / totalTrials) * 100}%`
                  }}
                  title={`منتهية: ${expiredTrials}`}
                />
              )}
            </div>
          </div>

          {/* Detailed Stage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stage 1: Active Trials */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>1. نسخ نشطة ومستمرة</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white text-emerald-700 border border-emerald-200">
                    {activeRate}%
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-800">
                  {activeTrials}
                </div>
                <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                  تراخيص تعمل بكامل وظائفها لدى العملاء
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-200/50 text-[10px] text-emerald-800/80 font-semibold flex items-center justify-between">
                <span>فرص تحويل مرتفعة</span>
                <span className="font-mono font-bold">جاهزة للإغلاق</span>
              </div>
            </div>

            {/* Stage 2: Expiring Soon (At Risk) */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 relative overflow-hidden flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                    <span>2. أوشكت على الانتهاء</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white text-amber-700 border border-amber-200">
                    خلال 7 أيام
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-amber-900 flex items-baseline gap-2">
                  <span>{upcomingExpiry}</span>
                  <span className="text-xs text-amber-600 font-normal">تراخيص</span>
                </div>
                <p className="text-[10px] text-amber-800 mt-1 font-medium">
                  تتطلب تواصل مندوب البيع لحسم التجديد أو الشراء
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-amber-200 text-[10px] text-amber-900 font-bold flex items-center justify-between">
                <span>إجراء فوري مطلوب</span>
                <span className="text-amber-700 underline cursor-pointer">جدولة اتصال</span>
              </div>
            </div>

            {/* Stage 3: Expired Trials */}
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-rose-800 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>3. نسخ منتهية الصلاحية</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white text-rose-700 border border-rose-200">
                    {expiredRate}%
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-rose-800">
                  {expiredTrials}
                </div>
                <p className="text-[10px] text-rose-700 mt-1 font-medium">
                  تراخيص تم إيقافها لانقضاء المدة التجريبية
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-rose-200/50 text-[10px] text-rose-800/80 font-semibold flex items-center justify-between">
                <span>إعادة الاستهداف</span>
                <span className="font-mono font-bold">عروض استرداد</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
