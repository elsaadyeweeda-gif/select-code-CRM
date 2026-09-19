import React, { useState } from 'react';
import { Users, Award, TrendingUp, Phone, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

export interface EmployeePerformance {
  name: string;
  total: number;
  completed: number;
  pending: number;
}

export interface EmployeeActivity {
  name: string;
  calls: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

export interface TeamProductivityLeaderboardProps {
  supportEngineers: EmployeePerformance[];
  monitoringSpecialists: EmployeeActivity[];
  statusBreakdown?: StatusBreakdown[];
  statusArabicMap?: Record<string, string>;
  className?: string;
  id?: string;
}

export const TeamProductivityLeaderboard: React.FC<TeamProductivityLeaderboardProps> = ({
  supportEngineers = [],
  monitoringSpecialists = [],
  statusBreakdown = [],
  statusArabicMap = {},
  className = '',
  id
}) => {
  const [activeTab, setActiveTab] = useState<'support' | 'monitoring'>('support');

  const totalSupportTasks = supportEngineers.reduce((acc, e) => acc + e.total, 0);
  const totalCalls = monitoringSpecialists.reduce((acc, e) => acc + e.calls, 0);

  // Status breakdown total
  const totalStatuses = statusBreakdown.reduce((acc, s) => acc + s.count, 0);

  return (
    <div
      id={id}
      className={`bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>لوحة إنتاجية الفرق ومخرجات العمل (Team Productivity & Outputs)</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            رصد إنجازات مهندسي الدعم الفني ونشاط موظفي المتابعة والجودة
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-bold">
          <button
            onClick={() => setActiveTab('support')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'support'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>فريق الدعم الفني ({supportEngineers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'monitoring'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>فريق المتابعة والجودة ({monitoringSpecialists.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Technical Support Engineers */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          {supportEngineers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-slate-100 space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">لا تتوفر إحصائيات للمهندسين حالياً</p>
              <p className="text-[11px] text-slate-400">ستظهر البيانات فور إسناد أو إنجاز مهام الدعم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-bold">
                    <th className="p-3 rounded-r-xl">المهندس المكلف</th>
                    <th className="p-3 text-center">التكليفات الكلية</th>
                    <th className="p-3 text-center">المهام المنجزة</th>
                    <th className="p-3 text-center">قيد المعالجة</th>
                    <th className="p-3 text-center w-40">معدل الإنجاز</th>
                    <th className="p-3 text-center rounded-l-xl">التقييم التشغيلي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supportEngineers.map((emp) => {
                    const perc = emp.total > 0 ? Math.round((emp.completed / emp.total) * 100) : 0;
                    return (
                      <tr key={emp.name} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-100 flex-shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-800">{emp.name}</span>
                          </div>
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {emp.total}
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-teal-700">
                          {emp.completed}
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-amber-600">
                          {emp.pending}
                        </td>

                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-600">
                              <span>{perc}%</span>
                              <span className="text-slate-400">({emp.completed}/{emp.total})</span>
                            </div>
                            <ProgressBar
                              value={perc}
                              color={perc >= 75 ? 'teal' : perc >= 50 ? 'amber' : 'rose'}
                              height="sm"
                              showLabel={false}
                            />
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                              perc >= 75
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : perc >= 50
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {perc >= 75 ? (
                              <>
                                <Award className="w-3 h-3 text-emerald-600" />
                                <span>متفوق</span>
                              </>
                            ) : perc >= 50 ? (
                              <>
                                <TrendingUp className="w-3 h-3 text-amber-600" />
                                <span>جيد</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-rose-600" />
                                <span>قيد التسريع</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Quality & Monitoring Specialists */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {monitoringSpecialists.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-slate-100 space-y-2">
              <Phone className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">لا تتوفر إحصائيات لمسؤولي الجودة حالياً</p>
              <p className="text-[11px] text-slate-400">ستظهر البيانات فور تسجيل مكالمات المتابعة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {monitoringSpecialists.map((emp) => {
                const callShare = totalCalls > 0 ? Math.round((emp.calls / totalCalls) * 100) : 0;
                return (
                  <div
                    key={emp.name}
                    className="p-4 rounded-xl border border-slate-150 bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-100">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">{emp.name}</span>
                          <span className="text-[10px] text-slate-400">أخصائي متابعة وجودة</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {callShare}% من الإجمالي
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium">
                        <span className="text-slate-500">مكالمات مكتملة:</span>
                        <strong className="text-indigo-800 font-mono font-bold text-sm">
                          {emp.calls} اتصال
                        </strong>
                      </div>
                      <ProgressBar value={callShare} color="indigo" height="sm" showLabel={false} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Monitoring Call Outcomes Breakdown */}
          {statusBreakdown.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h5 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>تصنيف مخرجات التواصل ونتائج المكالمات</span>
              </h5>

              <div className="flex flex-wrap gap-2">
                {statusBreakdown.map((item) => {
                  const label = statusArabicMap[item.status] || item.status;
                  const percentage = totalStatuses > 0 ? Math.round((item.count / totalStatuses) * 100) : 0;
                  return (
                    <div
                      key={item.status}
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs"
                    >
                      <span className="font-bold text-slate-700">{label}:</span>
                      <span className="font-mono font-black text-teal-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {item.count}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
