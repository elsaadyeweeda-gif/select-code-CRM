/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SalesRep, Customer, Visit, FollowUpTask, CustomerStatus } from '../types';
import { parseDateTimeToMs } from '../utils';

export const INITIAL_SALES_REPS: SalesRep[] = [
  { id: 'REP-01', name: 'حسام عيد', email: 'hosam@select-code.com', visitsCount: 15 },
  { id: 'REP-02', name: 'مهند', email: 'mohanad@select-code.com', visitsCount: 12 },
  { id: 'REP-03', name: 'احمد زين', email: 'zein@select-code.com', visitsCount: 9 },
  { id: 'REP-04', name: 'احمد محمود', email: 'mahmoud@select-code.com', visitsCount: 8 },
  { id: 'REP-05', name: 'عبد الرحمن مبروك', email: 'abdulrahman@select-code.com', visitsCount: 5 },
  { id: 'REP-06', name: 'منار ابراهيم', email: 'manar@select-code.com', visitsCount: 4 },
  { id: 'REP-07', name: 'سارة', email: 'sara@select-code.com', visitsCount: 3 },
  { id: 'REP-08', name: 'نانسي', email: 'nancy@select-code.com', visitsCount: 2 },
  { id: 'REP-09', name: 'رنا', email: 'rana@select-code.com', visitsCount: 0 }
];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_VISITS: Visit[] = [];

// UTILITY FUNCTIONS for LOCAL STORAGE
const STORAGE_KEY_PREFIX = 'sales_visit_crm_';

export function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

export function setStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

export function initStorageData() {
  const reps = getStoredData<SalesRep[]>('reps', []);
  const customers = getStoredData<Customer[]>('customers', []);
  const visits = getStoredData<Visit[]>('visits', []);

  if (reps.length === 0) setStoredData('reps', INITIAL_SALES_REPS);
  if (customers.length === 0) setStoredData('customers', INITIAL_CUSTOMERS);
  if (visits.length === 0) setStoredData('visits', INITIAL_VISITS);
}

// Compute followup tasks based on visits and customer records
export function generateFollowUps(visits: Visit[]): FollowUpTask[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks: FollowUpTask[] = [];

  // Group visits by customerName
  const customerVisits: { [name: string]: Visit[] } = {};
  visits.forEach(v => {
    const name = v.customerName;
    if (!name) return;
    if (!customerVisits[name]) {
      customerVisits[name] = [];
    }
    customerVisits[name].push(v);
  });

  // For each customer, find their latest visit chronologically
  Object.entries(customerVisits).forEach(([custName, custVisitsList]) => {
    // Sort visits by timestamp ascending so the last one is the latest
    custVisitsList.sort((a, b) => parseDateTimeToMs(a.timestamp) - parseDateTimeToMs(b.timestamp));
    const latestVisit = custVisitsList[custVisitsList.length - 1];

    let followUpDate = '';
    let notes = '';

    const isClosed = latestVisit.customerStatus === 'تم التعاقد' || latestVisit.customerStatus === 'غير مهتم';
    const isDismissed = !!latestVisit.reminderDismissed;

    if (!isClosed) {
      if (latestVisit.nextFollowUpDate) {
        followUpDate = latestVisit.nextFollowUpDate;
        notes = latestVisit.nextStep || latestVisit.followUpResult || 'متابعة مجدولة';
      } else if (latestVisit.visitType === 'زيارة جديدة') {
        // Auto-schedule 7 days later if it's a new visit and not closed
        const baseDate = parseDateTimeToMs(latestVisit.timestamp);
        const dateObj = baseDate > 0 ? new Date(baseDate) : new Date();
        dateObj.setDate(dateObj.getDate() + 7);
        followUpDate = dateObj.toISOString().split('T')[0];
        notes = 'متابعة ما بعد الزيارة التعريفية الأولى';
      }
    }

    // Only create a task if there is a scheduled followUpDate and it's not closed
    if (followUpDate && !isClosed) {
      const taskDate = new Date(followUpDate);
      taskDate.setHours(0, 0, 0, 0);

      const diffTime = taskDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: 'فائتة' | 'اليوم' | 'قادمة' | 'مكتملة' = isDismissed ? 'مكتملة' : 'قادمة';
      if (!isDismissed) {
        if (diffDays < 0) {
          status = 'فائتة';
        } else if (diffDays === 0) {
          status = 'اليوم';
        }
      }

      tasks.push({
        id: `TSK-${100 + tasks.length}`,
        customerName: custName,
        repName: latestVisit.repName,
        repId: latestVisit.repId || '',
        followUpDate: followUpDate,
        daysRemaining: diffDays,
        status: status,
        notes: isDismissed && latestVisit.reminderDismissReason 
          ? `[تمت إزالة التذكير: ${latestVisit.reminderDismissReason}] - ${notes}` 
          : notes,
        visitId: latestVisit.id,
        isDismissed: isDismissed,
        dismissedAt: latestVisit.reminderDismissedAt,
        dismissedBy: latestVisit.reminderDismissedBy,
        dismissReason: latestVisit.reminderDismissReason
      });
    }
  });

  return tasks.sort((a, b) => {
    if (a.status === 'مكتملة' && b.status !== 'مكتملة') return 1;
    if (b.status === 'مكتملة' && a.status !== 'مكتملة') return -1;
    return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime();
  });
}

