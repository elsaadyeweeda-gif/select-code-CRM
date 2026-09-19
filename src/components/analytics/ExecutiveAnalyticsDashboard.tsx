import React from 'react';
import { 
  Wrench, 
  Phone, 
  Calendar, 
  Star, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Layers,
  HeartHandshake
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { SatisfactionRatingChart } from './SatisfactionRatingChart';
import { TrialLifecyclePipeline } from './TrialLifecyclePipeline';
import { OperationalHealthSection } from './OperationalHealthSection';
import { TeamProductivityLeaderboard } from './TeamProductivityLeaderboard';

export interface SupportMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  activeTrials: number;
  expiredTrials: number;
  upcomingExpiry: number;
  avgCompletionHours: number;
  employeePerformance: Array<{
    name: string;
    total: number;
    completed: number;
    pending: number;
  }>;
}

export interface MonitoringMetrics {
  totalCalls: number;
  avgSatisfaction: number;
  satisfactionBreakdown: number[];
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  employeeActivity: Array<{
    name: string;
    calls: number;
  }>;
  activeComplaints: number;
  technicalIssuesReported: number;
}

export interface ExecutiveAnalyticsDashboardProps {
  metrics: SupportMetrics;
  mMetrics: MonitoringMetrics;
  statusArabicMap?: Record<string, string>;
  className?: string;
}

export const ExecutiveAnalyticsDashboard: React.FC<ExecutiveAnalyticsDashboardProps> = ({
  metrics,
  mMetrics,
  statusArabicMap = {},
  className = ''
}) => {
  // Safe defaults
  const safeMetrics: SupportMetrics = metrics || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    activeTrials: 0,
    expiredTrials: 0,
    upcomingExpiry: 0,
    avgCompletionHours: 0,
    employeePerformance: []
  };

  const safeMMetrics: MonitoringMetrics = mMetrics || {
    totalCalls: 0,
    avgSatisfaction: 0,
    satisfactionBreakdown: [0, 0, 0, 0, 0],
    statusBreakdown: [],
    employeeActivity: [],
    activeComplaints: 0,
    technicalIssuesReported: 0
  };

  const completionRate = safeMetrics.totalTasks > 0 
    ? Math.round((safeMetrics.completedTasks / safeMetrics.totalTasks) * 100) 
    : 0;

  return (
    <div className={`space-y-6 ${className}`} id="executive-analytics-dashboard">
      {/* =========================================================================
          LEVEL 1: HIGH-LEVEL SUMMARY KPI CARDS WITH TRENDS & ICONS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Support Tasks */}
        <MetricCard
          id="kpi-support-tasks"
          title="إجمالي مهام الدعم الفني"
          value={safeMetrics.totalTasks}
          icon={Wrench}
          variant="teal"
          progress={{
            current: safeMetrics.completedTasks,
            total: safeMetrics.totalTasks,
            label: 'نسبة الإنجاز الكلية'
          }}
          badge={{
            text: `${completionRate}% مكتملة`,
            variant: completionRate >= 70 ? 'emerald' : 'teal'
          }}
          trend={{
            value: `${safeMetrics.completedTasks} مهمة`,
            label: 'منجزة ومغلقة',
            direction: 'up',
            isPositive: true
          }}
          footer={
            <span className="font-mono font-bold text-amber-600">
              {safeMetrics.pendingTasks} قيد المعالجة
            </span>
          }
        />

        {/* 2. Active Trials & Pipeline */}
        <MetricCard
          id="kpi-active-trials"
          title="التراخيص التجريبية النشطة"
          value={safeMetrics.activeTrials}
          icon={Calendar}
          variant="blue"
          badge={{
            text: safeMetrics.upcomingExpiry > 0 ? `${safeMetrics.upcomingExpiry} تنتهي قريباً` : 'مستقرة',
            variant: safeMetrics.upcomingExpiry > 0 ? 'amber' : 'emerald'
          }}
          subtitle="تراخيص قيد التجربة الميدانية لدى العملاء"
          trend={
            safeMetrics.upcomingExpiry > 0
              ? {
                  value: `${safeMetrics.upcomingExpiry} تنبيه`,
                  label: 'خلال 7 أيام',
                  direction: 'down',
                  isPositive: false
                }
              : {
                  value: '0 انتهاء وشيك',
                  direction: 'neutral',
                  isPositive: true
                }
          }
          footer={
            <span className="font-mono text-slate-500">
              {safeMetrics.expiredTrials} نسخ منتهية
            </span>
          }
        />

        {/* 3. Follow-up & Quality Calls */}
        <MetricCard
          id="kpi-quality-calls"
          title="مكالمات المتابعة والجودة"
          value={safeMMetrics.totalCalls}
          icon={Phone}
          variant="indigo"
          badge={{
            text: 'تغطية دورية',
            variant: 'indigo'
          }}
          subtitle="اتصالات قياس الرضى وحل مشكلات ما بعد البيع"
          trend={{
            value: '+100%',
            label: 'توثيق وتتبع مستمر',
            direction: 'up',
            isPositive: true
          }}
          footer={
            <span className="font-mono text-indigo-700 font-bold">
              {safeMMetrics.employeeActivity.length} موظف متابعة نشط
            </span>
          }
        />

        {/* 4. Customer Satisfaction CSAT Score */}
        <MetricCard
          id="kpi-satisfaction-csat"
          title="مؤشر رضى العملاء الكلي (CSAT)"
          value={`${safeMMetrics.avgSatisfaction.toFixed(1)} ★`}
          icon={Star}
          variant="amber"
          badge={{
            text: safeMMetrics.avgSatisfaction >= 4.0 ? 'تقييم ممتاز' : 'مستقر',
            variant: safeMMetrics.avgSatisfaction >= 4.0 ? 'emerald' : 'amber'
          }}
          subtitle="متوسط تقييم الخدمة من 5 نجوم"
          trend={{
            value: `${safeMMetrics.avgSatisfaction} / 5.0`,
            label: 'جودة الخدمة',
            direction: safeMMetrics.avgSatisfaction >= 4.0 ? 'up' : 'neutral',
            isPositive: safeMMetrics.avgSatisfaction >= 4.0
          }}
          footer={
            <span className={`font-bold ${safeMMetrics.activeComplaints > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {safeMMetrics.activeComplaints > 0 ? `${safeMMetrics.activeComplaints} شكوى مفتوحة` : 'لا توجد شكاوى نشطة'}
            </span>
          }
        />
      </div>

      {/* =========================================================================
          LEVEL 2: OPERATIONAL HEALTH & DATA STORYTELLING CORRELATION
          ========================================================================= */}
      <OperationalHealthSection
        id="operational-health-section"
        totalTasks={safeMetrics.totalTasks}
        completedTasks={safeMetrics.completedTasks}
        pendingTasks={safeMetrics.pendingTasks}
        avgCompletionHours={safeMetrics.avgCompletionHours}
        avgSatisfaction={safeMMetrics.avgSatisfaction}
        totalCalls={safeMMetrics.totalCalls}
        activeComplaints={safeMMetrics.activeComplaints}
      />

      {/* Trial Lifecycle Pipeline */}
      <TrialLifecyclePipeline
        id="trial-lifecycle-pipeline"
        activeTrials={safeMetrics.activeTrials}
        upcomingExpiry={safeMetrics.upcomingExpiry}
        expiredTrials={safeMetrics.expiredTrials}
      />

      {/* =========================================================================
          LEVEL 3: TEAM PRODUCTIVITY & DETAILED MONITORING METRICS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer Satisfaction Deep Dive Chart (5 cols) */}
        <div className="lg:col-span-5">
          <SatisfactionRatingChart
            id="csat-deep-dive-chart"
            avgSatisfaction={safeMMetrics.avgSatisfaction}
            satisfactionBreakdown={safeMMetrics.satisfactionBreakdown}
            totalCalls={safeMMetrics.totalCalls}
            activeComplaints={safeMMetrics.activeComplaints}
            className="h-full"
          />
        </div>

        {/* Team Productivity & Operations Outputs Leaderboard (7 cols) */}
        <div className="lg:col-span-7">
          <TeamProductivityLeaderboard
            id="team-productivity-leaderboard"
            supportEngineers={safeMetrics.employeePerformance}
            monitoringSpecialists={safeMMetrics.employeeActivity}
            statusBreakdown={safeMMetrics.statusBreakdown}
            statusArabicMap={statusArabicMap}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};
