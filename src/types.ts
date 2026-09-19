/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SalesRep {
  id: string; // e.g. "REP-01"
  name: string; // اسم المندوب
  email: string; // البريد الإلكتروني للمندوب
  visitsCount: number;
}

export type VisitType = 'زيارة جديدة' | 'زيارة متابعة';

export type CustomerStatus = 
  | 'عميل محتمل'
  | 'جاري المتابعة'
  | 'تم إرسال عرض سعر'
  | 'تفاوض'
  | 'تم التعاقد'
  | 'غير مهتم';

export type InterestLevel = 'مرتفع' | 'متوسط' | 'منخفض';

export type VisitSource = 'زيارة ميدانية' | 'بيانات عملاء' | 'اعلان سوشيل مديا' | 'ترشيح' | 'غير ذلك';

export interface Visit {
  id: string;
  timestamp: string; // تاريخ الزيارة / وقت الإدخال
  repId: string; // معرف المندوب
  repName: string; // اسم المندوب
  visitSource?: VisitSource; // مصدر الزيارة: زيارة ميدانية، بيانات عملاء، إلخ
  visitType: VisitType; // نوع الزيارة
  customerName: string; // اسم العميل
  
  // Specific to New Visit (زيارة جديدة)
  activityType?: string; // نوع النشاط / مجال العمل (مثال: ملابس، جوالات، مصنع)
  requestedProduct?: string; // المنتج المطلوب (POS, ERP, غير ذلك)
  contactPerson?: string; // اسم الشخص المسؤول
  jobTitle?: string; // المسمى الوظيفي
  phone?: string; // رقم الهاتف
  whatsapp?: string; // رقم واتساب
  email?: string; // البريد الإلكتروني
  address?: string; // العنوان
  province?: string; // المحافظة / المنطقة
  summary?: string; // ملخص الزيارة
  needs?: string; // احتياجات العميل
  interestLevel?: InterestLevel; // مستوى الاهتمام
  
  // Specific to Follow-up Visit (زيارة متابعة)
  followUpNotes?: string; // ملاحظات المتابعة
  followUpResult?: string; // نتيجة المتابعة
  nextStep?: string; // الخطوة القادمة
  nextFollowUpDate?: string; // تاريخ المتابعة القادمة
  reminderDismissed?: boolean; // إزالة / إلغاء التذكير يدوياً
  reminderDismissedAt?: string; // وقت إزالة التذكير
  reminderDismissedBy?: string; // المستخدم الذي أزال التذكير
  reminderDismissReason?: string; // سبب إزالة التذكير أو نتيجة التواصل
  
  // Common
  customerStatus: CustomerStatus; // حالة العميل
  expectedOpportunityValue: number; // قيمة الفرصة المتوقعة
  attachmentUrl?: string; // مرفقات أو صور الزيارة
  latitude?: number; // إحداثيات الموقع خط العرض
  longitude?: number; // إحداثيات الموقع خط الطول
  isSubmitted?: boolean; // حالة الاعتماد والتقديم للزيارة من المندوب
}

export interface Customer {
  id: string; // Customer ID (e.g. "CUST-001")
  name: string; // اسم العميل
  repName?: string; // اسم المندوب المعين له العميل
  repId?: string; // معرف المندوب المعين له العميل
  activity: string; // النشاط
  requestedProduct?: string; // المنتج المطلوب
  contactPerson: string; // المسؤول
  phone: string; // الهاتف
  whatsapp?: string; // رقم واتساب
  email: string; // البريد الإلكتروني
  address: string; // العنوان
  province: string; // المحافظة
  firstVisitDate: string; // أول زيارة
  lastVisitDate: string; // آخر زيارة
  visitsCount: number; // عدد الزيارات
  currentStatus: CustomerStatus; // حالة العميل الحالية
  opportunityValue: number; // قيمة الفرصة
  latitude?: number; // إحداثيات الموقع خط العرض
  longitude?: number; // إحداثيات الموقع خط الطول
}

export interface FollowUpTask {
  id: string;
  customerName: string;
  repName: string;
  repId: string;
  followUpDate: string; // موعد المتابعة
  daysRemaining: number; // عدد الأيام المتبقية
  status: 'فائتة' | 'اليوم' | 'قادمة' | 'مكتملة'; // Task status
  notes: string;
  visitId?: string; // معرف الزيارة الأصلية المرتبطة بالتذكير
  isDismissed?: boolean; // هل تم إلغاء/إزالة التذكير يدوياً
  dismissedAt?: string;
  dismissedBy?: string;
  dismissReason?: string;
}

export type UserRole = 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring';

export interface UserAccount {
  id: string;
  username: string;
  role: UserRole;
  assignedReps: string[];
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTask {
  id: string;
  customerId: string;
  customerName: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  taskType: 'Final Version Installation' | 'Trial Version Installation' | 'Demo Presentation' | 'Training Session' | 'Maintenance' | 'Technical Issue Resolution' | 'Other';
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'New' | 'In Progress' | 'Waiting Customer Response' | 'Completed' | 'Cancelled';
  resolutionNotes?: string;
  createdAt: string;
  assignedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy: string;
  updatedAt: string;
  
  // Demo Presentation specific
  demoDate?: string | null;
  demoTime?: string | null;
  demoNotes?: string | null;
  demoObjective?: string | null;
  
  // Trial Installation specific
  trialStartDate?: string | null;
  trialExpirationDate?: string | null;
}

export interface SupportNote {
  id: string;
  taskId: string;
  note: string;
  author: string;
  timestamp: string;
  type?: 'general' | 'visit' | 'installation' | 'demo';
}

export interface SupportStatusHistory {
  id: string;
  taskId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  timestamp: string;
}

export interface TrialInstallation {
  id: string;
  customerId: string;
  customerName: string;
  taskId: string;
  startDate: string;
  expirationDate: string;
  status: 'Active' | 'Expired';
  createdBy: string;
  createdAt: string;
}

export interface MonitoringRecord {
  id: string;
  customerId: string;
  customerName: string;
  employeeId: string;
  employeeName: string;
  callResult: string;
  customerSatisfactionLevel: number; // 1-5
  issuesReported: string;
  recommendations: string;
  nextFollowUpDate: string;
  notes: string;
  status: 'Customer Interested' | 'Customer Not Interested' | 'Needs Follow-up' | 'Complaint Opened' | 'Technical Issue Reported' | 'Customer Satisfied' | 'Customer Unsatisfied';
  createdAt: string;
  createdBy: string;
}

export interface MonitoringStatusHistory {
  id: string;
  customerId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  timestamp: string;
}

export interface CRMNotification {
  id: string;
  type: 'new_task' | 'demo_assignment' | 'trial_expiry' | 'followup_reminder' | 'complaint_open' | 'pending_task';
  title: string;
  message: string;
  recipientId: string;
  recipientRole?: string | null;
  isRead: boolean;
  createdAt: string;
  relatedId?: string | null;
}

export type MonitoringRepTaskType = 
  | 'زيارة تفاوضية'
  | 'حل شكوى وتلافي اعتراضات'
  | 'متابعة تجديد عقد'
  | 'تسليم واستلام مستندات'
  | 'إعادة تواصل لإغلاق صفقة'
  | 'زيارة عاجلة'
  | 'أخرى';

export type MonitoringRepTaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type MonitoringRepTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface MonitoringRepTask {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  repName: string;
  taskType: MonitoringRepTaskType;
  title: string;
  description: string;
  priority: MonitoringRepTaskPriority;
  dueDate: string;
  status: MonitoringRepTaskStatus;
  notes?: string;
  repFeedback?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}
