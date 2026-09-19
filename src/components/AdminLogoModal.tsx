import React, { useState, useRef } from 'react';
import { 
  Image, 
  Upload, 
  RefreshCw, 
  Check, 
  X, 
  Link as LinkIcon, 
  Loader2, 
  AlertCircle,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface AdminLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string;
  onLogoUpdated: (newLogoUrl: string) => void;
  token?: string;
  triggerMessage: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const AdminLogoModal: React.FC<AdminLogoModalProps> = ({
  isOpen,
  onClose,
  currentLogo,
  onLogoUpdated,
  token,
  triggerMessage
}) => {
  const [logoMode, setLogoMode] = useState<'upload' | 'url' | 'preset'>('upload');
  const [previewLogo, setPreviewLogo] = useState<string>(currentLogo);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = [
    {
      id: 'default',
      name: 'شعار Select Code الأصلي',
      path: '/path-to-logo.png',
      description: 'أيقونة التيل والأزرق المعتمدة'
    },
    {
      id: 'vector-svg',
      name: 'شعار المتجهات الفيكتور',
      path: '/select-code-logo.svg',
      description: 'نسخة SVG نقية عالية الدقة'
    }
  ];

  if (!isOpen) return null;

  /**
   * Resizes & compresses user-uploaded images so they never exceed Firestore's 1MB limit.
   * Max dimensions 512x512 with high-quality bicubic resampling guarantees crisp visuals
   * while keeping payload sizes typically under 40-70 KB.
   */
  const compressAndOptimizeImage = async (file: File): Promise<string> => {
    // If it's an SVG file, check size
    if (file.type === 'image/svg+xml') {
      const text = await file.text();
      if (text.length <= 250 * 1024) {
        return `data:image/svg+xml;utf8,${encodeURIComponent(text)}`;
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
      reader.onload = (e) => {
        const img = new window.Image();
        img.onerror = () => reject(new Error('تعذر معالجة ملف الصورة. يرجى اختيار ملف صورة صالح.'));
        img.onload = () => {
          try {
            const maxDimension = 512;
            let { width, height } = img;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(width, 1);
            canvas.height = Math.max(height, 1);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('تعذر إنشاء بيئة معالجة الصورة');
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Export to WebP (great compression and supports alpha transparency)
            let output = canvas.toDataURL('image/webp', 0.88);

            // Fallback if browser does not support WebP export
            if (!output.startsWith('data:image/webp')) {
              output = canvas.toDataURL('image/png');
            }

            // If still larger than 250KB, use JPEG with 0.82 quality
            if (output.length > 250 * 1024) {
              output = canvas.toDataURL('image/jpeg', 0.82);
            }

            // Extra safety scale-down if still large
            if (output.length > 300 * 1024) {
              const smallCanvas = document.createElement('canvas');
              const sW = Math.round(width * 0.75);
              const sH = Math.round(height * 0.75);
              smallCanvas.width = sW;
              smallCanvas.height = sH;
              const sCtx = smallCanvas.getContext('2d');
              if (sCtx) {
                sCtx.imageSmoothingEnabled = true;
                sCtx.imageSmoothingQuality = 'high';
                sCtx.drawImage(canvas, 0, 0, sW, sH);
                output = smallCanvas.toDataURL('image/jpeg', 0.80);
              }
            }

            resolve(output);
          } catch (err) {
            reject(err);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerMessage('error', 'يرجى اختيار ملف صورة صالح (PNG, SVG, JPG, WEBP)');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      triggerMessage('error', 'حجم الصورة كبير جداً (أكثر من 12 ميجابايت). يرجى اختيار ملف أصغر.');
      return;
    }

    setIsCompressing(true);
    try {
      const optimizedDataUrl = await compressAndOptimizeImage(file);
      const approxBytes = Math.round((optimizedDataUrl.length * 3) / 4);
      const kb = Math.round(approxBytes / 1024);
      setCompressedSizeKb(kb);
      setPreviewLogo(optimizedDataUrl);
      triggerMessage('success', `تم تحسين وضغط الشعار بنجاح (${kb} كيلوبايت) ليناسب قاعدة البيانات بدقة وبدون أي بطء!`);
    } catch (err: any) {
      console.error('Image compression error:', err);
      triggerMessage('error', err.message || 'حدث خطأ أثناء معالجة الصورة');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlApply = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) {
      triggerMessage('error', 'يرجى إدخال رابط صورة صالح');
      return;
    }
    setCompressedSizeKb(null);
    setPreviewLogo(trimmed);
  };

  const handleSave = async () => {
    if (!previewLogo) {
      triggerMessage('error', 'يرجى تحديد الشعار أولاً');
      return;
    }

    // Defensive check: ensure data URL doesn't exceed 500KB to stay safely below Firestore's 1MB doc limit
    if (previewLogo.startsWith('data:') && previewLogo.length > 500 * 1024) {
      triggerMessage('error', 'حجم الشعار كبير جداً لقاعدة البيانات (أكبر من 500 كيلوبايت). يرجى رفع ملف صورة ليتم ضغطه وتحسينه تلقائياً.');
      return;
    }

    setSubmitting(true);
    try {
      const authToken = token || localStorage.getItem('sales_visit_crm_auth_token') || '';
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          companyLogo: previewLogo
        })
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.error || 'فشل حفظ الشعار الجديد');
      }

      // Save locally
      localStorage.setItem('sales_visit_crm_company_logo', previewLogo);
      onLogoUpdated(previewLogo);
      triggerMessage('success', 'تم تحديث وحفظ شعار الشركة بنجاح بواسطة مدير النظام!');
      onClose();
    } catch (err: any) {
      console.error('Update logo error:', err);
      triggerMessage('error', err.message || 'حدث خطأ أثناء حفظ الشعار');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetDefault = () => {
    setPreviewLogo('/path-to-logo.png');
    setCustomUrl('');
    setCompressedSizeKb(null);
  };

  return (
    <div 
      id="admin-logo-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-right">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs">
              <Image className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                تغيير وتحديث شعار النظام
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                لوحة مدير النظام لإدارة الهوية البصرية وشعار الشركة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5 overflow-y-auto text-sm">
          {/* CURRENT & PREVIEW LOGO */}
          <div className="flex items-center justify-center gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800">
            <div className="text-center space-y-2">
              <div className="w-36 h-36 mx-auto rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-0 flex items-center justify-center shadow-md overflow-hidden">
                <img
                  src={previewLogo}
                  alt="شعار المعاينة"
                  className="h-full w-full object-contain filter drop-shadow-xs"
                  onError={(e) => {
                    e.currentTarget.src = '/select-code-logo.svg';
                  }}
                />
              </div>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                المعاينة الحية المكبرة (بكامل حجم الإطار)
              </span>
            </div>

            <div className="text-right space-y-1 text-xs">
              <div className="font-extrabold text-slate-900 dark:text-white">
                هوية <span className="text-blue-600 dark:text-blue-400 font-black">Select</span> <span className="text-[#0d9488] dark:text-[#2dd4bf] font-black">Code</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                سيتم تحديث الشعار فوراً في الشريط العلوي وقوائم النظام وسحابة Firestore
              </p>
              <button
                type="button"
                onClick={handleResetDefault}
                className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-600 hover:text-teal-700 dark:text-teal-400 pt-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>استعادة الشعار الافتراضي</span>
              </button>
            </div>
          </div>

          {/* MODE TABS */}
          <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50 dark:bg-slate-850 gap-1 text-xs font-black">
            <button
              type="button"
              onClick={() => setLogoMode('upload')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                logoMode === 'upload'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              رفع ملف صورة
            </button>
            <button
              type="button"
              onClick={() => setLogoMode('url')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                logoMode === 'url'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              رابط خارجي (URL)
            </button>
            <button
              type="button"
              onClick={() => setLogoMode('preset')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                logoMode === 'preset'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              شعارات النظام الجاهزة
            </button>
          </div>

          {/* MODE: UPLOAD FILE */}
          {logoMode === 'upload' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                className="hidden"
                id="admin-logo-file-input"
              />
              <div
                onClick={() => !isCompressing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isCompressing
                    ? 'border-teal-400 bg-teal-50/40 dark:bg-teal-950/30 cursor-wait'
                    : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-teal-50/20'
                }`}
              >
                {isCompressing ? (
                  <div className="space-y-2">
                    <Loader2 className="w-8 h-8 mx-auto text-teal-600 dark:text-teal-400 animate-spin" />
                    <div className="font-black text-xs text-teal-800 dark:text-teal-200">
                      جاري تحسين وضغط الشعار لتوافقه التام مع قاعدة البيانات...
                    </div>
                    <div className="text-[10px] text-teal-600/80">
                      يتم تقليص الأبعاد وحفظ الشفافية بدون أي فقدان للجودة
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-teal-600 dark:text-teal-400 mb-2" />
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      انقر هنا لاختيار ملف الشعار من جهازك
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      يدعم صور PNG, SVG, JPG, WEBP — يتم ضغطها وتحسينها تلقائياً لتناسب السحابة
                    </div>
                  </>
                )}
              </div>

              {compressedSizeKb !== null && !isCompressing && (
                <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>حجم الشعار المضغوط: <strong className="font-mono">{compressedSizeKb} KB</strong></span>
                  </div>
                  <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    جاهز للحفظ السحابي الآمن ✓
                  </span>
                </div>
              )}
            </div>
          )}

          {/* MODE: EXTERNAL URL */}
          {logoMode === 'url' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                أدخل رابط صورة الشعار (HTTPS URL):
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleUrlApply}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-black text-xs hover:bg-teal-700 cursor-pointer"
                >
                  تطبيق
                </button>
              </div>
            </div>
          )}

          {/* MODE: PRESET */}
          {logoMode === 'preset' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                {presets.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setPreviewLogo(p.path)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      previewLogo === p.path
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-14 h-14 mx-auto rounded-xl bg-slate-50 dark:bg-slate-700 p-0 mb-2 flex items-center justify-center overflow-hidden border border-slate-200/60 dark:border-slate-600">
                      <img src={p.path} alt={p.name} className="h-full w-full object-contain" />
                    </div>
                    <div className="font-black text-xs text-center text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-[10px] text-center text-slate-400 mt-0.5">{p.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            id="admin-save-logo-btn"
            onClick={handleSave}
            disabled={submitting || isCompressing || !previewLogo}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري حفظ الشعار الجديد...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>اعتماد وحفظ الشعار</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogoModal;
