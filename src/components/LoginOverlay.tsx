import React, { useState } from 'react';
import { Shield, KeyRound, User, Loader2, Info } from 'lucide-react';

interface LoginOverlayProps {
  onLoginSuccess: (user: any, token: string) => void;
  triggerMessage: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function LoginOverlay({ onLoginSuccess, triggerMessage }: LoginOverlayProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('فضلاً أدخل اسم المستخدم وكلمة المرور');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      let data: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`استجابة غير صالحة (${res.status}): ${text.substring(0, 80)}`);
      }

      if (res.ok && data.status === 'success') {
        triggerMessage('success', `مرحباً بك مجدداً ${data.user.username}! تم التحقق وتسجيل الدخول الرقمي الآمن.`);
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMsg(data.error || 'خطأ في اسم المستخدم أو كلمة المرور');
        triggerMessage('error', data.error || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      setErrorMsg(`خطأ شبكة: تعذر الاتصال بسيرفر الترخيص الآمن (${err?.message || err})`);
      triggerMessage('error', 'خطأ في الاتصال بالسيرفر السحابي');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0f172a] flex flex-col justify-center items-center p-4 font-sans select-none overflow-y-auto" style={{ direction: 'rtl' }}>
      
      {/* Background radial soft ambient lights to add subtle craft premium vibe without over-engineering */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-teal-505/15 bg-teal-500/10 blur-3xl rounded-full"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-505/15 bg-indigo-500/10 blur-3xl rounded-full"></div>

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-8 text-right space-y-6 animate-scaleUp">
        
        {/* Shield Icon Graphic Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-3 pb-2 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">نظام المبيعات الميداني والزيارات</h1>
            <p className="text-[10px] text-teal-600 font-bold mt-1">بوابة الدخول المصرح وتحديد الصلاحيات والمتابعات الميدانية</p>
          </div>
        </div>



        <form onSubmit={handleSubmit} className="space-y-4.5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-150 rounded-2xl text-[10.5px] font-black text-rose-700 flex items-center gap-1.5">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>اسم الحساب المسجل:</span>
            </label>
            <input
              type="text"
              required
              disabled={submitting}
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-xs font-bold p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all text-right"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>رمز المرور الآمن:</span>
            </label>
            <input
              type="password"
              required
              disabled={submitting}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs font-bold p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all font-mono text-right"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>تسجيل الدخول للنظام</span>
            )}
          </button>
        </form>

        <p className="text-[9.5px] text-center text-slate-400 font-bold">
          نظام محمي ببروتوكولات الأمان والتدقيق المستمر © ٢٠٢٦
        </p>
      </div>

    </div>
  );
}
