export type Language = 'bn' | 'en';

export interface Translations {
  dashboard: string;
  attendance: string;
  income: string;
  expenses: string;
  workers: string;
  sites: string;
  billPad: string;
  users: string;
  settings: string;
  contractor: string;
  foreman: string;
  signOut: string;
  cloudSync: string;
  offline: string;
  themeToggle: string;
  langToggle: string;
  save: string;
  add: string;
  delete: string;
  edit: string;
  print: string;
  pdfDownload: string;
  sendWhatsApp: string;
  ownerNotice: string;
  themeCustomizer: string;
}

export const translations: Record<Language, Translations> = {
  bn: {
    dashboard: 'ড্যাশবোর্ড',
    attendance: 'হাজিরা',
    income: 'আয়',
    expenses: 'খরচ',
    workers: 'কর্মী',
    sites: 'সাইট',
    billPad: 'বিল প্যাড',
    users: 'ব্যবহারকারী',
    settings: 'সেটিংস',
    contractor: '👑 মালিক',
    foreman: '🛠 ফোরম্যান',
    signOut: 'লগআউট',
    cloudSync: '☁️ ক্লাউড সিঙ্ক চালু',
    offline: 'অফলাইন — নেট এলে তথ্য সিঙ্ক হবে',
    themeToggle: 'থিম পরিবর্তন',
    langToggle: 'English',
    save: 'সংরক্ষণ করুন',
    add: 'যোগ করুন',
    delete: 'মুছুন',
    edit: 'সম্পাদনা',
    print: 'প্রিন্ট করুন',
    pdfDownload: 'PDF ডাউনলোড',
    sendWhatsApp: 'WhatsApp পাঠান',
    ownerNotice: '📢 কর্মীদের উদ্দেশ্যে মালিকের বিশেষ নির্দেশনা',
    themeCustomizer: '🎨 থিম ও রঙের ডিজাইন',
  },
  en: {
    dashboard: 'Dashboard',
    attendance: 'Attendance',
    income: 'Income',
    expenses: 'Expenses',
    workers: 'Workers',
    sites: 'Sites',
    billPad: 'Bill Pad',
    users: 'Users',
    settings: 'Settings',
    contractor: '👑 Owner',
    foreman: '🛠 Foreman',
    signOut: 'Sign Out',
    cloudSync: '☁️ Cloud Sync Active',
    offline: 'Offline — Will sync when online',
    themeToggle: 'Toggle Theme',
    langToggle: 'বাংলা',
    save: 'Save',
    add: 'Add New',
    delete: 'Delete',
    edit: 'Edit',
    print: 'Print',
    pdfDownload: 'Download PDF',
    sendWhatsApp: 'Send WhatsApp',
    ownerNotice: '📢 Special Instructions from Owner',
    themeCustomizer: '🎨 Theme & Color Design',
  },
};
