export type UserRole = 'owner' | 'foreman';

export type WorkerRole = 'ইলেকট্রিশিয়ান' | 'ফোরম্যান' | 'হেল্পার';

export type ExpenseCategory = 'মালামাল' | 'যাতায়াত' | 'খাওয়া-দাওয়া' | 'ভাড়া/মেশিন' | 'অন্যান্য';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  role: UserRole;
  phone?: string;
  photoUrl?: string;
}

export interface Site {
  id: string;
  name: string;
  createdAt?: string;
}

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  phone: string;
  createdAt?: string;
}

export interface WorkerFinance {
  workerId: string;
  rate: number; // Daily wage in BDT
  prevDue: number; // Previous dues in BDT
  advance: number; // Advance paid in BDT
  paid: number; // Salary paid in BDT
  manualDays: number | null; // Nullable override for present days
  manualPayable: number | null; // Nullable override for total payable
}

export interface AttendanceRecord {
  id: string; // YYYY-MM-DD_workerId
  date: string; // YYYY-MM-DD
  workerId: string;
  workerName?: string;
  siteId: string;
  siteName?: string;
  present: number; // 1 or 0
  overtime: number; // ৳
  taken: number; // ৳ cash taken today by worker
}

export interface IncomeRecord {
  id: string;
  date: string;
  siteId: string;
  siteName?: string;
  amount: number;
  note: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  siteId: string;
  siteName?: string;
  category: ExpenseCategory;
  amount: number;
  note: string;
  createdBy?: string;
  createdAt?: string;
}

export interface CompanySetting {
  name: string; // English: Green Power and Construction
  nameBn?: string; // Bangla: গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন
  logoUrl?: string;
  phone?: string;
  address?: string;
  ownerName?: string;
  ownerPhotoUrl?: string;
  ownerMessage?: string; // Motivational notice/message to workers
}

export interface QuotationItem {
  id: string;
  description: string;
  unit: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface QuotationRecord {
  id: string;
  quotationNo: string;
  date: string;
  validUntil?: string;
  projectName: string;
  clientName: string;
  clientPhone: string;
  projectAddress: string;
  items: QuotationItem[];
  totalAmount: number;
  terms: string;
  status: 'পেন্ডিং' | 'অনুমোদিত' | 'বাতিল';
  createdAt?: string;
}


