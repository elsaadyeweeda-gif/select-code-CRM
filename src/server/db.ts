/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import crypto from 'crypto';

// Disable WebSocket requirement for serverless HTTP queries in Vercel
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || '';

if (!connectionString) {
  console.error("CRITICAL: DATABASE_URL / POSTGRES_URL is missing in environment variables!");
}

const sql = neon(connectionString);

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring';
  assignedReps: string[];
  permissions?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  details: string;
}

export interface Visit {
  id: string;
  timestamp: string;
  repId?: string;
  repName: string;
  visitSource?: string;
  visitType: 'زيارة جديدة' | 'زيارة متابعة';
  customerName: string;
  activityType?: string;
  requestedProduct?: string;
  contactPerson?: string;
  jobTitle?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  province?: string;
  summary?: string;
  needs?: string;
  interestLevel?: string;
  followUpNotes?: string;
  followUpResult?: string;
  nextStep?: string;
  nextFollowUpDate?: string;
  customerStatus: string;
  expectedOpportunityValue: number;
  attachmentUrl?: string;
  latitude?: number;
  longitude?: number;
  isSubmitted?: boolean;
  reminderDismissed?: boolean;
  reminderDismissedAt?: string;
  reminderDismissedBy?: string;
  reminderDismissReason?: string;
}

export interface Customer {
  id: string;
  name: string;
  repName?: string;
  repId?: string;
  activity?: string;
  requestedProduct?: string;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  province?: string;
  firstVisitDate?: string;
  lastVisitDate?: string;
  visitsCount?: number;
  currentStatus?: string;
  opportunityValue?: number;
  latitude?: number;
  longitude?: number;
}

export interface SystemSettings {
  id?: string;
  companyName?: string;
  companyLogo?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SupportTask {
  id: string;
  customerId: string;
  customerName: string;
  assignedEmployeeId: string;
  assignedEmployeeName?: string;
  taskType: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'New' | 'In Progress' | 'Waiting Customer Response' | 'Completed' | 'Cancelled';
  createdAt: string;
  assignedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy: string;
  updatedAt: string;
  demoDate?: string | null;
  demoTime?: string | null;
  demoNotes?: string | null;
  demoObjective?: string | null;
  trialStartDate?: string | null;
  trialExpirationDate?: string | null;
}

export interface SupportNote {
  id: string;
  taskId: string;
  note: string;
  author: string;
  timestamp: string;
  type?: string;
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
  callResult?: string;
  customerSatisfactionLevel: number;
  issuesReported?: string;
  recommendations?: string;
  nextFollowUpDate?: string;
  notes?: string;
  status: string;
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
  type: string;
  title: string;
  message: string;
  recipientId: string;
  recipientRole?: string | null;
  isRead: boolean;
  createdAt: string;
  relatedId?: string | null;
}

export interface MonitoringRepTask {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  repName: string;
  taskType?: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueDate?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  repFeedback?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ---------------- DATABASE INITIALIZATION & SCHEMA ----------------
let dbInitialized = false;

export async function seedInitialDatabaseIfEmpty(): Promise<void> {
  if (dbInitialized) return;

  try {
    // 1. Create Tables if they do not exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL,
        assigned_reps JSONB DEFAULT '[]'::jsonb,
        permissions JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS support_tasks (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS support_notes (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS support_status_history (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS trial_installations (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS monitoring_records (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS monitoring_status_history (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS monitoring_rep_tasks (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `;

    // 2. Check and Seed Admin User
    const existingUsers = await sql`SELECT id FROM users LIMIT 1`;
    if (existingUsers.length === 0) {
      const adminSalt = generateSalt();
      const adminPassHash = hashPassword('555531', adminSalt);
      const defaultAdmin: UserAccount = {
        id: 'usr-admin-default',
        username: 'Elsaady',
        passwordHash: adminPassHash,
        salt: adminSalt,
        role: 'Admin',
        assignedReps: [],
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await sql`
        INSERT INTO users (id, username, password_hash, salt, role, assigned_reps, permissions, is_active, created_at, updated_at)
        VALUES (
          ${defaultAdmin.id}, 
          ${defaultAdmin.username}, 
          ${defaultAdmin.passwordHash}, 
          ${defaultAdmin.salt}, 
          ${defaultAdmin.role}, 
          ${JSON.stringify(defaultAdmin.assignedReps)}, 
          ${JSON.stringify(defaultAdmin.permissions)}, 
          ${defaultAdmin.isActive}, 
          ${defaultAdmin.createdAt}, 
          ${defaultAdmin.updatedAt}
        )
      `;

      // Seed Default Sales Reps
      const defaultReps = ['حسام عيد', 'مهند', 'احمد زين', 'احمد محمود', 'عبد الرحمن مبروك', 'منار ابراهيم', 'سارة', 'نانسي', 'رنا', 'السعدي عويضة', 'رفيق حفني', 'أخرى'];
      await sql`
        INSERT INTO settings (key, data) 
        VALUES ('sales-reps-config', ${JSON.stringify({ list: defaultReps })})
        ON CONFLICT (key) DO NOTHING
      `;

      // Seed initial log
      const initLogId = 'log-' + crypto.randomUUID();
      await sql`
        INSERT INTO logs (id, timestamp, username, action, details)
        VALUES (${initLogId}, NOW(), 'System', 'db_initialized', 'تم إنشاء وتهيئة قاعدة بيانات Neon PostgreSQL بنجاح مع حساب Elsaady')
      `;
    }

    dbInitialized = true;
  } catch (err) {
    console.error("Error initializing PostgreSQL schema:", err);
  }
}

// ---------------- USER OPERATIONS ----------------

export async function getUsers(): Promise<UserAccount[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT * FROM users ORDER BY created_at ASC`;
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    passwordHash: r.password_hash,
    salt: r.salt,
    role: r.role,
    assignedReps: r.assigned_reps || [],
    permissions: r.permissions || [],
    isActive: r.is_active,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString()
  }));
}

export async function getUserByUsername(username: string): Promise<UserAccount | null> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT * FROM users WHERE LOWER(username) = LOWER(${username}) LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    username: r.username,
    passwordHash: r.password_hash,
    salt: r.salt,
    role: r.role,
    assignedReps: r.assigned_reps || [],
    permissions: r.permissions || [],
    isActive: r.is_active,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString()
  };
}

export async function getUserById(id: string): Promise<UserAccount | null> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    username: r.username,
    passwordHash: r.password_hash,
    salt: r.salt,
    role: r.role,
    assignedReps: r.assigned_reps || [],
    permissions: r.permissions || [],
    isActive: r.is_active,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString()
  };
}

export async function createUser(
  username: string,
  passwordPlain: string,
  role: 'Admin' | 'Manager' | 'User',
  assignedReps: string[],
  permissions: string[] = []
): Promise<UserAccount> {
  await seedInitialDatabaseIfEmpty();
  const existing = await getUserByUsername(username);
  if (existing) {
    throw new Error('اسم المستخدم موجود بالفعل مسبقاً');
  }

  const salt = generateSalt();
  const newUser: UserAccount = {
    id: 'usr-' + crypto.randomUUID(),
    username,
    passwordHash: hashPassword(passwordPlain, salt),
    salt,
    role,
    assignedReps: assignedReps || [],
    permissions: permissions || [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await sql`
    INSERT INTO users (id, username, password_hash, salt, role, assigned_reps, permissions, is_active, created_at, updated_at)
    VALUES (
      ${newUser.id}, 
      ${newUser.username}, 
      ${newUser.passwordHash}, 
      ${newUser.salt}, 
      ${newUser.role}, 
      ${JSON.stringify(newUser.assignedReps)}, 
      ${JSON.stringify(newUser.permissions)}, 
      ${newUser.isActive}, 
      ${newUser.createdAt}, 
      ${newUser.updatedAt}
    )
  `;

  return newUser;
}

export async function updateUser(
  id: string,
  updates: {
    role?: 'Admin' | 'Manager' | 'User';
    assignedReps?: string[];
    permissions?: string[];
  }
): Promise<UserAccount> {
  const user = await getUserById(id);
  if (!user) {
    throw new Error('لم يتم العثور على المستخدم المطلوب');
  }

  const freshRole = updates.role || user.role;
  const freshReps = updates.assignedReps !== undefined ? updates.assignedReps : user.assignedReps;
  const freshPermissions = updates.permissions !== undefined ? updates.permissions : user.permissions;
  const updatedAt = new Date().toISOString();

  await sql`
    UPDATE users 
    SET role = ${freshRole},
        assigned_reps = ${JSON.stringify(freshReps)},
        permissions = ${JSON.stringify(freshPermissions)},
        updated_at = ${updatedAt}
    WHERE id = ${id}
  `;

  return {
    ...user,
    role: freshRole,
    assignedReps: freshReps,
    permissions: freshPermissions,
    updatedAt
  };
}

export async function resetUserPassword(id: string, newPasswordPlain: string): Promise<void> {
  const salt = generateSalt();
  const passwordHash = hashPassword(newPasswordPlain, salt);
  const updatedAt = new Date().toISOString();

  await sql`
    UPDATE users 
    SET salt = ${salt}, 
        password_hash = ${passwordHash}, 
        updated_at = ${updatedAt} 
    WHERE id = ${id}
  `;
}

export async function toggleUserStatus(id: string, isActive: boolean): Promise<UserAccount> {
  const user = await getUserById(id);
  if (!user) {
    throw new Error('لم يتم العثور على المستخدم المطلوب');
  }
  const updatedAt = new Date().toISOString();

  await sql`
    UPDATE users 
    SET is_active = ${isActive}, 
        updated_at = ${updatedAt} 
    WHERE id = ${id}
  `;

  return { ...user, isActive, updatedAt };
}

// ---------------- AUDIT LOG OPERATIONS ----------------

export async function getLogs(): Promise<ActivityLog[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 200`;
  return rows.map(r => ({
    id: r.id,
    timestamp: new Date(r.timestamp).toISOString(),
    username: r.username,
    action: r.action,
    details: r.details
  }));
}

export async function addLog(username: string, action: string, details: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  const id = 'log-' + crypto.randomUUID();
  await sql`
    INSERT INTO logs (id, timestamp, username, action, details)
    VALUES (${id}, NOW(), ${username}, ${action}, ${details})
  `;
}

// ---------------- SALES REPS OPERATIONS ----------------

export async function getSalesReps(): Promise<string[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM settings WHERE key = 'sales-reps-config' LIMIT 1`;
  if (rows.length > 0 && rows[0].data?.list) {
    return rows[0].data.list;
  }
  const defaultReps = ['حسام عيد', 'مهند', 'احمد زين', 'احمد محمود', 'عبد الرحمن مبروك', 'منار ابراهيم', 'سارة', 'نانسي', 'رنا', 'السعدي عويضة', 'رفيق حفني', 'أخرى'];
  await saveSalesReps(defaultReps);
  return defaultReps;
}

export async function saveSalesReps(reps: string[]): Promise<string[]> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO settings (key, data)
    VALUES ('sales-reps-config', ${JSON.stringify({ list: reps })})
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
  `;
  return reps;
}

// ---------------- VISITS OPERATIONS ----------------

export async function getVisits(): Promise<Visit[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM visits`;
  const list: Visit[] = rows.map(r => r.data as Visit);
  return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function saveVisit(visit: Visit): Promise<Visit> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO visits (id, data)
    VALUES (${visit.id}, ${JSON.stringify(visit)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return visit;
}

export async function deleteVisit(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  await sql`DELETE FROM visits WHERE id = ${id}`;
}

// ---------------- CUSTOMERS OPERATIONS ----------------

export async function getCustomers(): Promise<Customer[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM customers`;
  return rows.map(r => r.data as Customer);
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO customers (id, data)
    VALUES (${customer.id}, ${JSON.stringify(customer)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  await sql`DELETE FROM customers WHERE id = ${id}`;
}

export async function transferCustomers(
  sourceRepName: string,
  targetRepName: string,
  customerIds?: string[],
  updateVisits: boolean = true
): Promise<{ transferredCustomersCount: number; updatedVisitsCount: number; transferredCustomerIds: string[] }> {
  const allCustomers = await getCustomers();
  const targetCustomers = allCustomers.filter(c => {
    if (customerIds && customerIds.length > 0) {
      return customerIds.includes(c.id);
    }
    return c.repName === sourceRepName;
  });

  const transferredCustomerIds: string[] = [];
  for (const cust of targetCustomers) {
    cust.repName = targetRepName;
    await saveCustomer(cust);
    transferredCustomerIds.push(cust.id);
  }

  let updatedVisitsCount = 0;
  if (updateVisits && targetCustomers.length > 0) {
    const allVisits = await getVisits();
    const custNames = new Set(targetCustomers.map(c => (c.name || '').trim().toLowerCase()));
    const visitsToUpdate = allVisits.filter(v =>
      custNames.has((v.customerName || '').trim().toLowerCase()) &&
      v.repName === sourceRepName
    );

    for (const v of visitsToUpdate) {
      v.repName = targetRepName;
      await saveVisit(v);
      updatedVisitsCount++;
    }
  }

  return {
    transferredCustomersCount: transferredCustomerIds.length,
    updatedVisitsCount,
    transferredCustomerIds
  };
}

// ---------------- SYSTEM SETTINGS OPERATIONS ----------------

export async function getSystemSettings(): Promise<SystemSettings> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM settings WHERE key = 'company-profile' LIMIT 1`;
  if (rows.length > 0 && rows[0].data) {
    return rows[0].data as SystemSettings;
  }
  return {
    id: 'company-profile',
    companyName: 'Select Code',
    companyLogo: '/path-to-logo.png'
  };
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  await seedInitialDatabaseIfEmpty();
  const existing = await getSystemSettings();
  const updated: SystemSettings = {
    ...existing,
    ...settings,
    id: 'company-profile',
    updatedAt: new Date().toISOString()
  };

  await sql`
    INSERT INTO settings (key, data)
    VALUES ('company-profile', ${JSON.stringify(updated)})
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
  `;

  return updated;
}

// ---------------- TECHNICAL SUPPORT OPERATIONS ----------------

export async function getSupportTasks(): Promise<SupportTask[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM support_tasks`;
  const list: SupportTask[] = rows.map(r => r.data as SupportTask);
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveSupportTask(task: SupportTask): Promise<SupportTask> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO support_tasks (id, data)
    VALUES (${task.id}, ${JSON.stringify(task)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return task;
}

export async function deleteSupportTask(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  await sql`DELETE FROM support_tasks WHERE id = ${id}`;
}

export async function getSupportNotes(taskId?: string): Promise<SupportNote[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM support_notes`;
  const list: SupportNote[] = rows.map(r => r.data as SupportNote);
  const filtered = taskId ? list.filter(n => n.taskId === taskId) : list;
  return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function saveSupportNote(note: SupportNote): Promise<SupportNote> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO support_notes (id, data)
    VALUES (${note.id}, ${JSON.stringify(note)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return note;
}

export async function getSupportStatusHistory(taskId?: string): Promise<SupportStatusHistory[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM support_status_history`;
  const list: SupportStatusHistory[] = rows.map(r => r.data as SupportStatusHistory);
  const filtered = taskId ? list.filter(h => h.taskId === taskId) : list;
  return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function saveSupportStatusHistory(hist: SupportStatusHistory): Promise<SupportStatusHistory> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO support_status_history (id, data)
    VALUES (${hist.id}, ${JSON.stringify(hist)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return hist;
}

export async function getTrialInstallations(): Promise<TrialInstallation[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM trial_installations`;
  const list: TrialInstallation[] = rows.map(r => r.data as TrialInstallation);
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveTrialInstallation(trial: TrialInstallation): Promise<TrialInstallation> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO trial_installations (id, data)
    VALUES (${trial.id}, ${JSON.stringify(trial)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return trial;
}

export async function getMonitoringRecords(customerId?: string): Promise<MonitoringRecord[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM monitoring_records`;
  const list: MonitoringRecord[] = rows.map(r => r.data as MonitoringRecord);
  const filtered = customerId ? list.filter(r => r.customerId === customerId) : list;
  return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveMonitoringRecord(rec: MonitoringRecord): Promise<MonitoringRecord> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO monitoring_records (id, data)
    VALUES (${rec.id}, ${JSON.stringify(rec)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return rec;
}

export async function getMonitoringStatusHistory(customerId?: string): Promise<MonitoringStatusHistory[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM monitoring_status_history`;
  const list: MonitoringStatusHistory[] = rows.map(r => r.data as MonitoringStatusHistory);
  const filtered = customerId ? list.filter(h => h.customerId === customerId) : list;
  return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function saveMonitoringStatusHistory(hist: MonitoringStatusHistory): Promise<MonitoringStatusHistory> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO monitoring_status_history (id, data)
    VALUES (${hist.id}, ${JSON.stringify(hist)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return hist;
}

export async function getNotifications(): Promise<CRMNotification[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM notifications`;
  const list: CRMNotification[] = rows.map(r => r.data as CRMNotification);
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveNotification(notif: CRMNotification): Promise<CRMNotification> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO notifications (id, data)
    VALUES (${notif.id}, ${JSON.stringify(notif)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return notif;
}

export async function updateNotificationRead(id: string, isRead: boolean): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM notifications WHERE id = ${id} LIMIT 1`;
  if (rows.length > 0) {
    const notif = rows[0].data as CRMNotification;
    notif.isRead = isRead;
    await saveNotification(notif);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  await sql`DELETE FROM notifications WHERE id = ${id}`;
}

export async function getMonitoringRepTasks(filter?: { repName?: string; customerId?: string }): Promise<MonitoringRepTask[]> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM monitoring_rep_tasks`;
  const list: MonitoringRepTask[] = rows.map(r => r.data as MonitoringRepTask);
  const filtered = list.filter(item => {
    if (filter?.repName && item.repName !== filter.repName) return false;
    if (filter?.customerId && item.customerId !== filter.customerId) return false;
    return true;
  });
  return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveMonitoringRepTask(task: MonitoringRepTask): Promise<MonitoringRepTask> {
  await seedInitialDatabaseIfEmpty();
  await sql`
    INSERT INTO monitoring_rep_tasks (id, data)
    VALUES (${task.id}, ${JSON.stringify(task)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `;
  return task;
}

export async function updateMonitoringRepTask(id: string, updates: Partial<MonitoringRepTask>): Promise<MonitoringRepTask | null> {
  await seedInitialDatabaseIfEmpty();
  const rows = await sql`SELECT data FROM monitoring_rep_tasks WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return null;
  const current = rows[0].data as MonitoringRepTask;
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  await saveMonitoringRepTask(updated);
  return updated;
}

export async function deleteMonitoringRepTask(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  await sql`DELETE FROM monitoring_rep_tasks WHERE id = ${id}`;
}
