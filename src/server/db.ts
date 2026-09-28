/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import { neon, neonConfig } from '@neondatabase/serverless';
import crypto from 'crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  where 
} from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';

// Determine Database Engine (Supports Vercel Postgres, Neon, Supabase, or Firebase Firestore)
const connectionString = (
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_URL_NON_POOLING || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.NEON_DATABASE_URL || 
  ''
).trim();

let sql: any = null;
if (connectionString) {
  try {
    neonConfig.fetchConnectionCache = true;
    sql = neon(connectionString);
    console.log("Using PostgreSQL / Neon database engine (Vercel / Cloud).");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL connection, falling back to Firebase Firestore:", err);
    sql = null;
  }
} else {
  console.log("No PostgreSQL connection string provided. Using Firebase Firestore database.");
}

export const isPostgres = !!sql;

// Resolution of Firebase Configuration (supports Vercel Environment Variables, GitHub Secrets, or local JSON)
export const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId || '(default)',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || rawFirebaseConfig.measurementId || ""
};

if (process.env.FIREBASE_CONFIG) {
  try {
    const parsed = typeof process.env.FIREBASE_CONFIG === 'string'
      ? JSON.parse(process.env.FIREBASE_CONFIG)
      : process.env.FIREBASE_CONFIG;
    Object.assign(firebaseConfig, parsed);
  } catch (e) {
    console.warn("Failed to parse FIREBASE_CONFIG environment variable:", e);
  }
}

// Initialize Firebase Firestore only when NOT using PostgreSQL
let db: any = null;
if (!isPostgres) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  } catch (err) {
    console.error("Failed to initialize Firebase Firestore:", err);
  }
}

// ---------------- DATA INTERFACES ----------------

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
let dbInitPromise: Promise<void> | null = null;

export async function seedInitialDatabaseIfEmpty(): Promise<void> {
  if (dbInitialized) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    if (isPostgres && sql) {
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

        // 2. Check and Seed Admin User in Postgres
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
          const defaultReps = ['حسام عيد', 'مهند', 'احمد زين', 'احمد محمود', 'عبد الرحمن مبروك', 'منار ابراهيم', 'سارة', 'نانسي', 'محمد بهاء', 'السعدي عويضة', 'رفيق حفني', 'أخرى'];
          await sql`
            INSERT INTO settings (key, data) 
            VALUES ('sales-reps-config', ${JSON.stringify({ list: defaultReps })})
            ON CONFLICT (key) DO NOTHING
          `;

          const initLogId = 'log-' + crypto.randomUUID();
          await sql`
            INSERT INTO logs (id, timestamp, username, action, details)
            VALUES (${initLogId}, NOW(), 'System', 'db_initialized', 'تم تهيئة قاعدة بيانات Neon PostgreSQL بنجاح مع حساب Elsaady')
          `;
        }
      } catch (err) {
        console.error("Error initializing PostgreSQL schema:", err);
      }
    } else if (db) {
      // Firestore seeding if empty
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(1)));
        if (snap.empty) {
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
          await setDoc(doc(db, 'users', defaultAdmin.id), defaultAdmin);
        }
      } catch (err) {
        console.error("Error checking Firestore initialization:", err);
      }
    }

    dbInitialized = true;
  })();

  await dbInitPromise;
}

export function getDatabaseEngineInfo() {
  return {
    engine: isPostgres ? 'postgresql' : 'firestore',
    isPostgres,
    isInitialized: dbInitialized,
    postgresConfigured: !!connectionString,
    firestoreProjectId: firebaseConfig.projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId
  };
}

// ---------------- USER OPERATIONS ----------------

export async function getUsers(): Promise<UserAccount[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT * FROM users ORDER BY created_at ASC`;
    return rows.map((r: any) => ({
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

  const snap = await getDocs(collection(db, 'users'));
  const list: UserAccount[] = [];
  snap.forEach(d => {
    list.push(d.data() as UserAccount);
  });
  return list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

export async function getUserByUsername(username: string): Promise<UserAccount | null> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
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

  const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].data() as UserAccount;
  }
  const all = await getUsers();
  return all.find(u => (u.username || '').toLowerCase() === username.toLowerCase()) || null;
}

export async function getUserById(id: string): Promise<UserAccount | null> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
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

  const snap = await getDoc(doc(db, 'users', id));
  if (snap.exists()) {
    return snap.data() as UserAccount;
  }
  return null;
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

  if (isPostgres) {
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
  } else {
    await setDoc(doc(db, 'users', newUser.id), newUser);
  }

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

  if (isPostgres) {
    await sql`
      UPDATE users 
      SET role = ${freshRole},
          assigned_reps = ${JSON.stringify(freshReps)},
          permissions = ${JSON.stringify(freshPermissions)},
          updated_at = ${updatedAt}
      WHERE id = ${id}
    `;
  } else {
    await updateDoc(doc(db, 'users', id), {
      role: freshRole,
      assignedReps: freshReps,
      permissions: freshPermissions,
      updatedAt
    });
  }

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

  if (isPostgres) {
    await sql`
      UPDATE users 
      SET salt = ${salt}, 
          password_hash = ${passwordHash}, 
          updated_at = ${updatedAt} 
      WHERE id = ${id}
    `;
  } else {
    await updateDoc(doc(db, 'users', id), {
      salt,
      passwordHash,
      updatedAt
    });
  }
}

export async function toggleUserStatus(id: string, isActive?: boolean): Promise<UserAccount> {
  const user = await getUserById(id);
  if (!user) {
    throw new Error('لم يتم العثور على المستخدم المطلوب');
  }
  const nextStatus = isActive !== undefined ? isActive : !user.isActive;
  const updatedAt = new Date().toISOString();

  if (isPostgres) {
    await sql`
      UPDATE users 
      SET is_active = ${nextStatus}, 
          updated_at = ${updatedAt} 
      WHERE id = ${id}
    `;
  } else {
    await updateDoc(doc(db, 'users', id), {
      isActive: nextStatus,
      updatedAt
    });
  }

  return { ...user, isActive: nextStatus, updatedAt };
}

// ---------------- AUDIT LOG OPERATIONS ----------------

export async function getLogs(limitCount: number = 200): Promise<ActivityLog[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT * FROM logs ORDER BY timestamp DESC LIMIT ${limitCount}`;
    return rows.map((r: any) => ({
      id: r.id,
      timestamp: new Date(r.timestamp).toISOString(),
      username: r.username,
      action: r.action,
      details: r.details
    }));
  }

  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  const list: ActivityLog[] = [];
  snap.forEach(d => list.push(d.data() as ActivityLog));
  return list;
}

export async function addLog(username: string, action: string, details: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  const id = 'log-' + crypto.randomUUID();
  const timestamp = new Date().toISOString();

  if (isPostgres) {
    await sql`
      INSERT INTO logs (id, timestamp, username, action, details)
      VALUES (${id}, NOW(), ${username}, ${action}, ${details})
    `;
  } else {
    const log: ActivityLog = { id, timestamp, username, action, details };
    await setDoc(doc(db, 'logs', id), log);
  }
}

// ---------------- SALES REPS OPERATIONS ----------------

export async function getSalesReps(): Promise<string[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM settings WHERE key = 'sales-reps-config' LIMIT 1`;
    if (rows.length > 0 && rows[0].data?.list) {
      return rows[0].data.list;
    }
  } else {
    const ref = doc(db, 'settings', 'sales-reps-config');
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data()?.list) {
      return snap.data().list;
    }
  }

  const defaultReps = ['حسام عيد', 'مهند', 'احمد زين', 'احمد محمود', 'عبد الرحمن مبروك', 'منار ابراهيم', 'سارة', 'نانسي', 'محمد بهاء', 'السعدي عويضة', 'رفيق حفني', 'أخرى'];
  await saveSalesReps(defaultReps);
  return defaultReps;
}

export async function saveSalesReps(reps: string[]): Promise<string[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO settings (key, data)
      VALUES ('sales-reps-config', ${JSON.stringify({ list: reps })})
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    const ref = doc(db, 'settings', 'sales-reps-config');
    await setDoc(ref, { list: reps }, { merge: true });
  }
  return reps;
}

// ---------------- VISITS OPERATIONS ----------------

export async function getVisits(): Promise<Visit[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM visits`;
    const list: Visit[] = rows.map((r: any) => r.data as Visit);
    return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  const snap = await getDocs(collection(db, 'visits'));
  const list: Visit[] = [];
  snap.forEach(d => list.push(d.data() as Visit));
  return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function saveVisit(visit: Visit): Promise<Visit> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO visits (id, data)
      VALUES (${visit.id}, ${JSON.stringify(visit)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'visits', visit.id), visit);
  }
  return visit;
}

export async function deleteVisit(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`DELETE FROM visits WHERE id = ${id}`;
  } else {
    await deleteDoc(doc(db, 'visits', id));
  }
}

export async function deleteAllVisits(): Promise<number> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const countRes = await sql`SELECT count(*)::int AS cnt FROM visits`;
    const count = countRes[0]?.cnt || 0;
    await sql`DELETE FROM visits`;
    return count;
  }

  const snap = await getDocs(collection(db, 'visits'));
  const docs = snap.docs;
  const batchSize = 400;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    await Promise.all(chunk.map(d => deleteDoc(d.ref)));
  }
  return docs.length;
}

export async function deleteVisitsByIds(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`DELETE FROM visits WHERE id = ANY(${ids})`;
    return ids.length;
  }

  const batchSize = 400;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    await Promise.all(chunk.map(id => deleteDoc(doc(db, 'visits', id))));
  }
  return ids.length;
}

export async function deleteVisitsByFilter(filters: { 
  repName?: string; 
  fromDate?: string; 
  toDate?: string; 
  customerStatus?: string;
  visitType?: string;
}): Promise<number> {
  const allVisits = await getVisits();
  const toDelete = allVisits.filter(v => {
    if (filters.repName && filters.repName !== 'الكل' && v.repName !== filters.repName) {
      return false;
    }
    if (filters.customerStatus && filters.customerStatus !== 'الكل' && v.customerStatus !== filters.customerStatus) {
      return false;
    }
    if (filters.visitType && filters.visitType !== 'الكل' && v.visitType !== filters.visitType) {
      return false;
    }
    if (filters.fromDate) {
      const vDate = (v.timestamp || '').split('T')[0];
      if (vDate < filters.fromDate) return false;
    }
    if (filters.toDate) {
      const vDate = (v.timestamp || '').split('T')[0];
      if (vDate > filters.toDate) return false;
    }
    return true;
  });

  const ids = toDelete.map(v => v.id);
  if (ids.length > 0) {
    await deleteVisitsByIds(ids);
  }
  return ids.length;
}

// ---------------- CUSTOMERS OPERATIONS ----------------

export async function getCustomers(): Promise<Customer[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM customers`;
    return rows.map((r: any) => r.data as Customer);
  }

  const snap = await getDocs(collection(db, 'customers'));
  const list: Customer[] = [];
  snap.forEach(d => list.push(d.data() as Customer));
  return list;
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO customers (id, data)
      VALUES (${customer.id}, ${JSON.stringify(customer)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'customers', customer.id), customer);
  }
  return customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`DELETE FROM customers WHERE id = ${id}`;
  } else {
    await deleteDoc(doc(db, 'customers', id));
  }
}

export async function deleteAllCustomers(deleteAssociatedVisits: boolean = false): Promise<{ customersCount: number; visitsCount: number }> {
  await seedInitialDatabaseIfEmpty();
  let deletedVisitsCount = 0;
  if (deleteAssociatedVisits) {
    deletedVisitsCount = await deleteAllVisits();
  }

  if (isPostgres) {
    const countRes = await sql`SELECT count(*)::int AS cnt FROM customers`;
    const count = countRes[0]?.cnt || 0;
    await sql`DELETE FROM customers`;
    return { customersCount: count, visitsCount: deletedVisitsCount };
  }

  const snap = await getDocs(collection(db, 'customers'));
  const docs = snap.docs;
  const batchSize = 400;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    await Promise.all(chunk.map(d => deleteDoc(d.ref)));
  }
  return { customersCount: docs.length, visitsCount: deletedVisitsCount };
}

export async function deleteCustomersByIds(ids: string[], deleteAssociatedVisits: boolean = false): Promise<{ customersCount: number; visitsCount: number }> {
  if (!ids || ids.length === 0) return { customersCount: 0, visitsCount: 0 };
  await seedInitialDatabaseIfEmpty();

  let deletedVisitsCount = 0;
  if (deleteAssociatedVisits) {
    const allCustomers = await getCustomers();
    const targetCustomers = allCustomers.filter(c => ids.includes(c.id));
    const targetNames = new Set(targetCustomers.map(c => (c.name || '').trim().toLowerCase()));

    const allVisits = await getVisits();
    const visitsToDelete = allVisits.filter(v => targetNames.has((v.customerName || '').trim().toLowerCase()));
    if (visitsToDelete.length > 0) {
      await deleteVisitsByIds(visitsToDelete.map(v => v.id));
      deletedVisitsCount = visitsToDelete.length;
    }
  }

  if (isPostgres) {
    await sql`DELETE FROM customers WHERE id = ANY(${ids})`;
    return { customersCount: ids.length, visitsCount: deletedVisitsCount };
  }

  const batchSize = 400;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    await Promise.all(chunk.map(id => deleteDoc(doc(db, 'customers', id))));
  }
  return { customersCount: ids.length, visitsCount: deletedVisitsCount };
}

export async function deleteCustomersByFilter(filters: {
  repName?: string;
  province?: string;
  currentStatus?: string;
}, deleteAssociatedVisits: boolean = false): Promise<{ customersCount: number; visitsCount: number }> {
  const allCustomers = await getCustomers();
  const toDelete = allCustomers.filter(c => {
    if (filters.repName && filters.repName !== 'الكل' && c.repName !== filters.repName) {
      return false;
    }
    if (filters.province && filters.province !== 'الكل' && c.province !== filters.province) {
      return false;
    }
    if (filters.currentStatus && filters.currentStatus !== 'الكل' && c.currentStatus !== filters.currentStatus) {
      return false;
    }
    return true;
  });

  const ids = toDelete.map(c => c.id);
  if (ids.length > 0) {
    return await deleteCustomersByIds(ids, deleteAssociatedVisits);
  }
  return { customersCount: 0, visitsCount: 0 };
}

export async function purgeAllCRMData(): Promise<{ customersCount: number; visitsCount: number }> {
  const visitsCount = await deleteAllVisits();
  const custRes = await deleteAllCustomers(false);
  return { customersCount: custRes.customersCount, visitsCount };
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
  if (updateVisits) {
    const allVisits = await getVisits();
    let visitsToUpdate: Visit[] = [];

    if (customerIds && customerIds.length > 0) {
      const custNames = new Set(targetCustomers.map(c => (c.name || '').trim().toLowerCase()));
      visitsToUpdate = allVisits.filter(v =>
        (v.repName === sourceRepName) &&
        custNames.has((v.customerName || '').trim().toLowerCase())
      );
    } else {
      // Transfer ALL visits belonging to sourceRepName
      visitsToUpdate = allVisits.filter(v => (v.repName || '').trim() === sourceRepName.trim());
    }

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
  if (isPostgres) {
    const rows = await sql`SELECT data FROM settings WHERE key = 'company-profile' LIMIT 1`;
    if (rows.length > 0 && rows[0].data) {
      return rows[0].data as SystemSettings;
    }
  } else {
    const ref = doc(db, 'settings', 'company-profile');
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data()) {
      return snap.data() as SystemSettings;
    }
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

  if (isPostgres) {
    await sql`
      INSERT INTO settings (key, data)
      VALUES ('company-profile', ${JSON.stringify(updated)})
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    const ref = doc(db, 'settings', 'company-profile');
    await setDoc(ref, updated, { merge: true });
  }

  return updated;
}

// ---------------- TECHNICAL SUPPORT OPERATIONS ----------------

export async function getSupportTasks(): Promise<SupportTask[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM support_tasks`;
    const list: SupportTask[] = rows.map((r: any) => r.data as SupportTask);
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  const snap = await getDocs(collection(db, 'support_tasks'));
  const list: SupportTask[] = [];
  snap.forEach(d => list.push(d.data() as SupportTask));
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveSupportTask(task: SupportTask): Promise<SupportTask> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO support_tasks (id, data)
      VALUES (${task.id}, ${JSON.stringify(task)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'support_tasks', task.id), task);
  }
  return task;
}

export async function deleteSupportTask(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`DELETE FROM support_tasks WHERE id = ${id}`;
  } else {
    await deleteDoc(doc(db, 'support_tasks', id));
  }
}

export async function getSupportNotes(taskId?: string): Promise<SupportNote[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM support_notes`;
    const list: SupportNote[] = rows.map((r: any) => r.data as SupportNote);
    const filtered = taskId ? list.filter(n => n.taskId === taskId) : list;
    return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  const snap = await getDocs(collection(db, 'support_notes'));
  const list: SupportNote[] = [];
  snap.forEach(d => list.push(d.data() as SupportNote));
  const filtered = taskId ? list.filter(n => n.taskId === taskId) : list;
  return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function saveSupportNote(note: SupportNote): Promise<SupportNote> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO support_notes (id, data)
      VALUES (${note.id}, ${JSON.stringify(note)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'support_notes', note.id), note);
  }
  return note;
}

export async function getSupportStatusHistory(taskId?: string): Promise<SupportStatusHistory[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM support_status_history`;
    const list: SupportStatusHistory[] = rows.map((r: any) => r.data as SupportStatusHistory);
    const filtered = taskId ? list.filter(h => h.taskId === taskId) : list;
    return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  const snap = await getDocs(collection(db, 'support_status_history'));
  const list: SupportStatusHistory[] = [];
  snap.forEach(d => list.push(d.data() as SupportStatusHistory));
  const filtered = taskId ? list.filter(h => h.taskId === taskId) : list;
  return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function saveSupportStatusHistory(hist: SupportStatusHistory): Promise<SupportStatusHistory> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO support_status_history (id, data)
      VALUES (${hist.id}, ${JSON.stringify(hist)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'support_status_history', hist.id), hist);
  }
  return hist;
}

export async function getTrialInstallations(): Promise<TrialInstallation[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM trial_installations`;
    const list: TrialInstallation[] = rows.map((r: any) => r.data as TrialInstallation);
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  const snap = await getDocs(collection(db, 'trial_installations'));
  const list: TrialInstallation[] = [];
  snap.forEach(d => list.push(d.data() as TrialInstallation));
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveTrialInstallation(trial: TrialInstallation): Promise<TrialInstallation> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO trial_installations (id, data)
      VALUES (${trial.id}, ${JSON.stringify(trial)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'trial_installations', trial.id), trial);
  }
  return trial;
}

// ---------------- CUSTOMER MONITORING OPERATIONS ----------------

export async function getMonitoringRecords(customerId?: string): Promise<MonitoringRecord[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM monitoring_records`;
    const list: MonitoringRecord[] = rows.map((r: any) => r.data as MonitoringRecord);
    const filtered = customerId ? list.filter(r => r.customerId === customerId) : list;
    return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  const snap = await getDocs(collection(db, 'monitoring_records'));
  const list: MonitoringRecord[] = [];
  snap.forEach(d => list.push(d.data() as MonitoringRecord));
  const filtered = customerId ? list.filter(r => r.customerId === customerId) : list;
  return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveMonitoringRecord(rec: MonitoringRecord): Promise<MonitoringRecord> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO monitoring_records (id, data)
      VALUES (${rec.id}, ${JSON.stringify(rec)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'monitoring_records', rec.id), rec);
  }
  return rec;
}

export async function getMonitoringStatusHistory(customerId?: string): Promise<MonitoringStatusHistory[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM monitoring_status_history`;
    const list: MonitoringStatusHistory[] = rows.map((r: any) => r.data as MonitoringStatusHistory);
    const filtered = customerId ? list.filter(h => h.customerId === customerId) : list;
    return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  const snap = await getDocs(collection(db, 'monitoring_status_history'));
  const list: MonitoringStatusHistory[] = [];
  snap.forEach(d => list.push(d.data() as MonitoringStatusHistory));
  const filtered = customerId ? list.filter(h => h.customerId === customerId) : list;
  return filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export async function saveMonitoringStatusHistory(hist: MonitoringStatusHistory): Promise<MonitoringStatusHistory> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO monitoring_status_history (id, data)
      VALUES (${hist.id}, ${JSON.stringify(hist)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'monitoring_status_history', hist.id), hist);
  }
  return hist;
}

// ---------------- NOTIFICATIONS OPERATIONS ----------------

export async function getNotifications(recipientId?: string, recipientRole?: string | null): Promise<CRMNotification[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM notifications`;
    const list: CRMNotification[] = rows.map((r: any) => r.data as CRMNotification);
    const filtered = list.filter(n => {
      if (!recipientId && !recipientRole) return true;
      if (recipientId && n.recipientId === recipientId) return true;
      if (recipientRole && n.recipientRole === recipientRole) return true;
      return false;
    });
    return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  const snap = await getDocs(collection(db, 'notifications'));
  const list: CRMNotification[] = [];
  snap.forEach(d => list.push(d.data() as CRMNotification));
  const filtered = list.filter(n => {
    if (!recipientId && !recipientRole) return true;
    if (recipientId && n.recipientId === recipientId) return true;
    if (recipientRole && n.recipientRole === recipientRole) return true;
    return false;
  });
  return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveNotification(notif: CRMNotification): Promise<CRMNotification> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO notifications (id, data)
      VALUES (${notif.id}, ${JSON.stringify(notif)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'notifications', notif.id), notif);
  }
  return notif;
}

export async function updateNotificationRead(id: string, isRead: boolean): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM notifications WHERE id = ${id} LIMIT 1`;
    if (rows.length > 0) {
      const notif = rows[0].data as CRMNotification;
      notif.isRead = isRead;
      await saveNotification(notif);
    }
  } else {
    const ref = doc(db, 'notifications', id);
    await updateDoc(ref, { isRead });
  }
}

export async function deleteNotification(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`DELETE FROM notifications WHERE id = ${id}`;
  } else {
    await deleteDoc(doc(db, 'notifications', id));
  }
}

// ---------------- MONITORING REP TASKS OPERATIONS ----------------

export async function getMonitoringRepTasks(filter?: { repName?: string; customerId?: string }): Promise<MonitoringRepTask[]> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    const rows = await sql`SELECT data FROM monitoring_rep_tasks`;
    const list: MonitoringRepTask[] = rows.map((r: any) => r.data as MonitoringRepTask);
    const filtered = list.filter(item => {
      if (filter?.repName && item.repName !== filter.repName) return false;
      if (filter?.customerId && item.customerId !== filter.customerId) return false;
      return true;
    });
    return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  const snap = await getDocs(collection(db, 'monitoring_rep_tasks'));
  const list: MonitoringRepTask[] = [];
  snap.forEach(d => list.push(d.data() as MonitoringRepTask));
  const filtered = list.filter(item => {
    if (filter?.repName && item.repName !== filter.repName) return false;
    if (filter?.customerId && item.customerId !== filter.customerId) return false;
    return true;
  });
  return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveMonitoringRepTask(task: MonitoringRepTask): Promise<MonitoringRepTask> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`
      INSERT INTO monitoring_rep_tasks (id, data)
      VALUES (${task.id}, ${JSON.stringify(task)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
  } else {
    await setDoc(doc(db, 'monitoring_rep_tasks', task.id), task);
  }
  return task;
}

export async function updateMonitoringRepTask(id: string, updates: Partial<MonitoringRepTask>): Promise<MonitoringRepTask | null> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
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

  const ref = doc(db, 'monitoring_rep_tasks', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const current = snap.data() as MonitoringRepTask;
  const updated: MonitoringRepTask = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  await setDoc(ref, updated);
  return updated;
}

export async function deleteMonitoringRepTask(id: string): Promise<void> {
  await seedInitialDatabaseIfEmpty();
  if (isPostgres) {
    await sql`DELETE FROM monitoring_rep_tasks WHERE id = ${id}`;
  } else {
    await deleteDoc(doc(db, 'monitoring_rep_tasks', id));
  }
}
