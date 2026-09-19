import React from 'react';
import { Star, Smile, Meh, Frown, ShieldCheck, HeartHandshake } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

export interface SatisfactionRatingChartProps {
  avgSatisfaction: number;
  satisfactionBreakdown: number[]; // [star1Count, star2Count, star3Count, star4Count, star5Count]
  totalCalls: number;
  activeComplaints?: number;
  className?: string;
  id?: string;
}

export const SatisfactionRatingChart: React.FC<SatisfactionRatingChartProps> = ({
  avgSatisfaction = 0,
  satisfactionBreakdown = [0, 0, 0, 0, 0],
  totalCalls = 0,
  activeComplaints = 0,
  className = '',
  id
}) => {
  const counts = [
    satisfactionBreakdown[4] || 0, // 5 stars
    satisfactionBreakdown[3] || 0, // 4 stars
    satisfactionBreakdown[2] || 0, // 3 stars
    satisfactionBreakdown[1] || 0, // 2 stars
    satisfactionBreakdown[0] || 0  // 1 star
  ];

  const totalRatings = counts.reduce((acc, c) => acc + c, 0);

  // Sentiment buckets
  const positiveCount = (counts[0] || 0) + (counts[1] || 0); // 5 + 4 stars
  const neutralCount = counts[2] || 0; // 3 stars
  const negativeCount = (counts[3] || 0) + (counts[4] || 0); // 2 + 1 stars

  const positivePercent = totalRatings > 0 ? Math.round((positiveCount / totalRatings) * 100) : 0;
  const neutralPercent = totalRatings > 0 ? Math.round((neutralCount / totalRatings) * 100) : 0;
  const negativePercent = totalRatings > 0 ? Math.round((negativeCount / totalRatings) * 100) : 0;

  const starConfig = [
    { stars: 5, label: '5 نجوم', color: 'emerald' as const, count: counts[0] },
    { stars: 4, label: '4 نجوم', color: 'teal' as const, count: counts[1] },
    { stars: 3, label: '3 نجوم', color: 'amber' as const, count: counts[2] },
    { stars: 2, label: 'نجمتان', color: 'rose' as const, count: counts[3] },
    { stars: 1, label: 'نجمة واحدة', color: 'rose' as const, count: counts[4] }
  ];

  // Qualitative sentiment label
  const getSentimentText = (score: number) => {
    if (score >= 4.5) return { text: 'مستوى رضى استثنائي', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 4.0) return { text: 'مستوى رضى عالي ومطمئن', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    if (score >= 3.0) return { text: 'مستوى رضى متوسط مستقر', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { text: 'بحاجة إلى تكثيف المتابعة', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const sentiment = getSentimentText(avgSatisfaction);

  return (
    <div
      id={id}
      className={`bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-teal-600" />
            <span>تحليل مؤشر رضى العملاء الشامل (CSAT Score)</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            توزيع تقييمات المكالمات الدورية وتفصيل مستويات القبول والولاء
          </p>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${sentiment.color}`}>
          {sentiment.text}
        </span>
      </div>

      {totalRatings === 0 ? (
        <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-slate-100 space-y-2">
          <Star className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 font-bold">لا توجد تقييمات رضى مسجلة حتى الآن</p>
          <p className="text-[11px] text-slate-400">ستظهر المخططات فور تسجيل أول مكالمة جودة وتقييم العميل</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Score & Distribution Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left/Score Block (4 cols) */}
            <div className="md:col-span-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[11px] font-bold text-slate-500">متوسط الرضى الكلي</span>
              
              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-4xl font-black font-mono tracking-tight text-teal-700">
                  {avgSatisfaction.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-slate-400">/ 5.0</span>
              </div>

              {/* 5-Star Visual */}
              <div className="flex items-center gap-1 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(avgSatisfaction)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200 fill-slate-100'
                    }`}
                  />
                ))}
              </div>

              <div className="text-[10px] text-slate-500 font-medium">
                مستند إلى <strong className="text-slate-700 font-mono">{totalRatings}</strong> تقييماً مسجلاً
              </div>
            </div>

            {/* Right/Distribution Bars (8 cols) */}
            <div className="md:col-span-8 space-y-2.5">
              {starConfig.map((item) => {
                const percentage = totalRatings > 0 ? Math.round((item.count / totalRatings) * 100) : 0;
                return (
                  <div key={item.stars} className="flex items-center gap-3 text-xs">
                    {/* Star Label */}
                    <div className="w-16 flex items-center justify-end gap-1 flex-shrink-0 text-slate-600 font-bold text-[11px]">
                      <span>{item.stars}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    </div>

                    {/* Progress Track */}
                    <div className="flex-1">
                      <ProgressBar
                        value={percentage}
                        color={item.color}
                        height="md"
                        showLabel={false}
                      />
                    </div>

                    {/* Count & Percentage */}
                    <div className="w-16 text-left flex-shrink-0 flex items-baseline justify-end gap-1 font-mono text-[11px]">
                      <span className="font-bold text-slate-700">{percentage}%</span>
                      <span className="text-slate-400 text-[10px]">({item.count})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Sentiment Health Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Smile className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block">انطباع إيجابي (4-5★)</span>
                  <span className="text-[11px] font-mono text-emerald-700 font-bold">{positiveCount} عميل</span>
                </div>
              </div>
              <span className="text-xs font-black font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                {positivePercent}%
              </span>
            </div>

            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Meh className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-amber-800 font-bold block">انطباع محايد (3★)</span>
                  <span className="text-[11px] font-mono text-amber-700 font-bold">{neutralCount} عميل</span>
                </div>
              </div>
              <span className="text-xs font-black font-mono text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                {neutralPercent}%
              </span>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <Frown className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block">بحاجة لتحسين (1-2★)</span>
                  <span className="text-[11px] font-mono text-rose-700 font-bold">{negativeCount} عميل</span>
                </div>
              </div>
              <span className="text-xs font-black font-mono text-rose-800 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                {negativePercent}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
