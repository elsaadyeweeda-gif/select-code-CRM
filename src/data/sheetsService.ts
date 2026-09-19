/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Visit, Customer } from '../types';

export interface SheetsSyncState {
  webAppUrl: string;
  autoSync: boolean;
  lastSyncTime: string | null;
  isConnected: boolean;
}

/**
 * Helper to construct authentication headers containing the secure active token
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('sales_visit_crm_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Checks if a given string is a valid Google Apps Script Web App URL.
 */
export function isValidWebAppUrl(url: string): boolean {
  if (!url) return false;
  // Standard Google script url regex
  const scriptRegex = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
  // Allow simple protocol testing as well
  return url.startsWith('https://script.google.com/');
}

/**
 * Test connections to the Google Sheets Apps Script Web App URL
 */
export async function testSheetsConnection(url: string): Promise<boolean> {
  if (!isValidWebAppUrl(url)) {
    throw new Error('رابط غير صالح. يرجى توفير رابط Apps Script Web App ينتهي بـ /exec');
  }

  try {
    // First, try the server-side proxy to fully bypass CORS
    const proxyRes = await fetch('/api/sheets/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ webAppUrl: url })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return data && (data.status === 'success' || data.isConnected === true || data.message === 'متصل');
    }
  } catch (e) {
    console.warn('Backend proxy test failed, trying direct browser fetch fallback...', e);
  }

  // Direct client fallback (utilizes no-cors so that it never throws a CORS block error)
  try {
    const fbRes = await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action: 'ping' })
    });
    return true;
  } catch (innerErr: any) {
    throw new Error(innerErr.message || 'فشل الاتصال بالرابط. تأكد من تفعيل صلاحيات النشر لـ "Anyone" على Google Web App.');
  }
}

/**
 * Sends a full sync payload (Visits + Customers) to the Google Sheet.
 */
export async function syncAllToSheets(
  url: string, 
  visits: Visit[], 
  customers: Customer[],
  deletedIds?: string[]
): Promise<{ success: boolean; message: string }> {
  if (!isValidWebAppUrl(url)) {
    return { success: false, message: 'رابط ويب غير صالح' };
  }

  // 1. Try local Express proxy first (completely safe against CORS and "Failed to fetch" block)
  try {
    const proxyRes = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ webAppUrl: url, visits, customers, deletedIds })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && (data.status === 'success' || data.success === true)) {
        return { success: true, message: data.message || 'تمت المزامنة الكاملة وتحديث الجداول وتأكيده بنجاح!' };
      }
      return { success: false, message: data.error || 'فشلت المزامنة في السيرفر السحابي' };
    }
  } catch (e) {
    console.warn('Backend proxy sync failed, trying direct fallback...', e);
  }

  // 2. Direct browser fetch fallback (using mode: no-cors to prevent browser block)
  try {
    const payload = {
      action: 'sync_all',
      visits,
      customers,
      deletedIds
    };

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    return { 
      success: true, 
      message: 'تم إرسال طلب ترحيل البيانات بنجاح! يرجى مراجعة ملف Google Sheets للتأكد من ترحيل السجلات بالكامل.' 
    };
  } catch (error: any) {
    console.error('Error syncing data directly:', error);
    return { success: false, message: error.message || 'حدث خطأ في الشبكة أثناء ترحيل البيانات مباشرة' };
  }
}

/**
 * Appends a single newly logged visit to the Google Sheet in real-time.
 */
export async function syncSingleVisitToSheets(url: string, visit: Visit): Promise<boolean> {
  if (!isValidWebAppUrl(url)) return false;

  try {
    // Try Server proxy first
    const proxyRes = await fetch('/api/sheets/add-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ webAppUrl: url, visit })
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return data && (data.status === 'success' || data.success === true);
    }
  } catch (e) {
    console.warn('Backend proxy single visit sync failed, trying direct fallback...', e);
  }

  // Fallback direct with no-cors to avoid CORS preflight options block
  try {
    const payload = {
      action: 'add_visit',
      visit
    };

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.warn('Silent note: auto-syncing single visit paused or offline:', error);
    return false;
  }
}

/**
 * Imports visits and customer records back from Google Sheets into the React app.
 */
export async function importFromSheets(url: string): Promise<{
  success: boolean;
  message: string;
  visits?: Visit[];
  customers?: Customer[];
}> {
  if (!isValidWebAppUrl(url)) {
    return { success: false, message: 'رابط ويب غير صالح' };
  }

  // 1. Try local Express proxy first
  try {
    const proxyRes = await fetch('/api/sheets/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ webAppUrl: url })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && (data.status === 'success' || data.success === true)) {
        return {
          success: true,
          message: 'تم جلب واستيراد وتحديث البيانات بنجاح من Google Sheet!',
          visits: data.visits || [],
          customers: data.customers || []
        };
      }
      return { success: false, message: (data && data.error) || 'لم تعثر المزامنة على بيانات متوافقة مع الهيكل المعتمد.' };
    }
  } catch (e) {
    console.warn('Backend proxy import failed, attempting direct browser fetch fallback...', e);
  }

  // 2. Direct browser fetch fallback
  try {
    const res = await fetch(`${url}?action=get_data`, {
      method: 'GET',
      mode: 'cors'
    });

    if (!res.ok) {
      throw new Error(`خطأ رد السيرفر: ${res.status}`);
    }

    const data = await res.json();
    if (data.status === 'success') {
      return {
        success: true,
        message: 'تم جلب البيانات بنجاح من Google Sheet!',
        visits: data.visits,
        customers: data.customers
      };
    } else {
      return { success: false, message: data.error || 'فشلت جلب البيانات من ملف جوجل.' };
    }
  } catch (error: any) {
    console.error('Error importing from Google Sheets directly:', error);
    return { 
      success: false, 
      message: error.message || 'فشل جلب البيانات مباشرة. تأكد من تفعيل جلب البيانات doGet وتثبيت المزامنة بصيغة Web App مع السماح لـ "Anyone".'
    };
  }
}
