import React, { useState } from 'react';
import { CompanySetting, UserProfile, Worker, Site, AttendanceRecord, WorkerFinance, IncomeRecord, ExpenseRecord } from '../types';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { Language } from '../utils/i18n';
import { THEME_PRESETS, applyThemeColors } from '../utils/themeManager';
import {
  Save,
  Building2,
  UserCheck,
  Phone,
  MapPin,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  Cloud,
  Copy,
  QrCode,
  HelpCircle,
  FileJson,
  Trash2,
  RotateCcw,
  Settings2,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  X,
  AlertTriangle,
  Upload,
  Bell,
  Palette
} from 'lucide-react';

interface SettingsProps {
  company: CompanySetting;
  user: UserProfile;
  workers?: Worker[];
  sites?: Site[];
  attendance?: AttendanceRecord[];
  finances?: Record<string, WorkerFinance>;
  income?: IncomeRecord[];
  expenses?: ExpenseRecord[];
  lang?: Language;
}

export const Settings: React.FC<SettingsProps> = ({
  company,
  user,
  workers = [],
  sites = [],
  attendance = [],
  finances = {},
  income = [],
  expenses = [],
}) => {
  // Sub-Tab Navigation State (Organized into 5 distinct clean tabs)
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'theme' | 'notices' | 'cloud' | 'backup'>('company');

  // Theme Customizer States (Logo color matching)
  const [themeCopper, setThemeCopper] = useState(() => {
    try {
      const stored = localStorage.getItem('custom_theme_colors');
      if (stored) return JSON.parse(stored).copper || '#059669';
    } catch {}
    return '#059669';
  });

  const [themeAmber, setThemeAmber] = useState(() => {
    try {
      const stored = localStorage.getItem('custom_theme_colors');
      if (stored) return JSON.parse(stored).amber || '#10b981';
    } catch {}
    return '#10b981';
  });

  const handleApplyPreset = (copper: string, amber: string) => {
    setThemeCopper(copper);
    setThemeAmber(amber);
    applyThemeColors(copper, amber);
    setActionMessage('🎨 থিম সফলভাবে পরিবর্তিত হয়েছে!');
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleSaveCustomColors = (e: React.FormEvent) => {
    e.preventDefault();
    applyThemeColors(themeCopper, themeAmber);
    setActionMessage('🎨 নিজস্ব কালার থিম সফলভাবে সংরক্ষিত ও প্রয়োগ করা হয়েছে!');
    setTimeout(() => setActionMessage(null), 3000);
  };

  // Company & Profile States
  const [name, setName] = useState(company.name || 'Green Power and Construction');
  const [nameBn, setNameBn] = useState(company.nameBn || 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন');
  const [logoUrl, setLogoUrl] = useState(company.logoUrl || '/logo.svg');
  const [ownerName, setOwnerName] = useState(company.ownerName || user.name || 'মালিক');
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState(company.ownerPhotoUrl || user.photoUrl || '/contractor.svg');
  const [phone, setPhone] = useState(company.phone || user.phone || '01700000000');
  const [address, setAddress] = useState(company.address || 'ঢাকা, বাংলাদেশ');
  const [ownerMessage, setOwnerMessage] = useState(
    company.ownerMessage || "কাজের নিরাপত্তা আগে, তারপর কাজ। সততা, সময়ানুবর্তিতা ও নিখুঁত ওয়্যারিংয়ের মাধ্যমে আমরা 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন' কে সামনে এগিয়ে নিয়ে যাব।"
  );

  // Status & UI States
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Firebase Config Form States
  const [autoSync, setAutoSync] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [apiKey, setApiKey] = useState('AIzaSyCoJma63ExeyVbqwTafN1sBnQJvToDnPV0');
  const [projectId, setProjectId] = useState('excellent-dispatcher-ht3g1');
  const [appId, setAppId] = useState('1:326676867985:web:67ccb025b4e4033b4d4830');
  const [authDomain, setAuthDomain] = useState('excellent-dispatcher-ht3g1.firebaseapp.com');

  // Modals Toggle
  const [showQrModal, setShowQrModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Presets for owner notices
  const presets = [
    {
      title: '🛡️ নিরাপত্তা ও সততা (Safety & Honesty)',
      text: "কাজের নিরাপত্তা আগে, তারপর কাজ। সততা, সময়ানুবর্তিতা ও নিখুঁত ওয়্যারিংয়ের মাধ্যমে আমরা 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন' কে সামনে এগিয়ে নিয়ে যাব।",
    },
    {
      title: '⚡ মান নিয়ন্ত্রণ ও মানসম্মত কাজ (Quality First)',
      text: "প্রতিটি সাইটে শতভাগ কোয়ালিটি ওয়্যারিং ও কাজের মান বজায় রাখুন। কর্মীদের সুরক্ষা ও ক্লায়েন্টের সন্তুষ্টি আমাদের মূল লক্ষ্য।",
    },
    {
      title: '🤝 একতা ও দলগত শৃঙ্খলা (Teamwork & Discipline)',
      text: "আমরা সবাই এক পরিবার। সাইটে পিপিই (সেফটি হেলমেট, সেফটি জুতা, গ্লাভস) ব্যবহার করুন এবং শৃঙ্খলার সাথে নির্ধারিত সময়ে কাজ শেষ করুন।",
    },
    {
      title: '🌙 রাতের নির্দেশনা (Night Order for Tomorrow)',
      text: "আগামীকালের জন্য বিশেষ নির্দেশনা: সকল ফোরম্যান সকাল ৮ ঘটিকার মধ্যে সাইটে উপস্থিত থেকে মেটেরিয়ালস রিসিভ করুন এবং হাজিরা এন্টি সম্পন্ন করুন।",
    },
  ];

  // Handlers for File Upload (Logo & Photo)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('লোগো ফাইলের সাইজ সর্বোচ্চ 2MB হতে পারবে।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContractorPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('কন্ট্রাক্টর ছবির সাইজ সর্বোচ্চ 2MB হতে পারবে।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setOwnerPhotoUrl(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Settings Submit
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setError(null);

    try {
      const updatedCompanyData: CompanySetting = {
        name: name.trim(),
        nameBn: nameBn.trim(),
        logoUrl: logoUrl,
        ownerName: ownerName.trim(),
        ownerPhotoUrl: ownerPhotoUrl,
        phone: phone.trim(),
        address: address.trim(),
        ownerMessage: ownerMessage.trim(),
      };

      await setDoc(doc(db, 'settings', 'company'), updatedCompanyData);

      const updatedUserProfile = {
        ...user,
        name: ownerName.trim(),
        photoUrl: ownerPhotoUrl,
        phone: phone.trim(),
      };
      await setDoc(doc(db, 'users', user.uid), updatedUserProfile);

      localStorage.setItem('bijli_local_user', JSON.stringify(updatedUserProfile));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      console.error(err);
      setError('সেটিংস সেভ করতে সমস্যা হয়েছে। দয়া করে ইন্টারনেট বা ফায়ারবেস কানেকশন পরীক্ষা করুন।');
    } finally {
      setSaving(false);
    }
  };

  // Save Firebase Custom Config
  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const config = { apiKey, projectId, appId, authDomain };
    localStorage.setItem('custom_firebase_config', JSON.stringify(config));
    setActionMessage('✅ ফায়ারবেস কনফিগারেশন স্থানীয়ভাবে সংরক্ষণ করা হয়েছে!');
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Test Connection
  const handleTestConnection = async () => {
    try {
      setActionMessage('⏳ ফায়ারবেস কানেকশন টেস্ট করা হচ্ছে...');
      await getDocs(collection(db, 'workers'));
      setActionMessage('🟢 ক্লাউড কানেকশন সফল! ফায়ারবেস ডাটাবেজ সচল রয়েছে।');
    } catch (err: unknown) {
      setActionMessage('❌ কানেকশন ব্যর্থ হয়েছে। ইন্টারনেটের উপস্থিতি নিশ্চিত করুন।');
    }
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Copy Web Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // JSON Export
  const handleExportJson = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      company: { name, nameBn, logoUrl, ownerName, ownerPhotoUrl, phone, address, ownerMessage },
      workers,
      sites,
      attendance,
      finances,
      income,
      expenses,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Green_Power_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setActionMessage('✅ ব্যাকআপ ফাইল (.json) সফলভাবে ডাউনলোড হয়েছে!');
    setTimeout(() => setActionMessage(null), 4000);
  };

  // JSON Restore
  const handleRestoreJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        setActionMessage('⏳ ডাটা রিস্টোর করা হচ্ছে...');

        if (Array.isArray(parsed.workers)) {
          for (const w of parsed.workers) {
            if (w.id) await setDoc(doc(db, 'workers', w.id), w);
          }
        }

        if (Array.isArray(parsed.sites)) {
          for (const s of parsed.sites) {
            if (s.id) await setDoc(doc(db, 'sites', s.id), s);
          }
        }

        if (Array.isArray(parsed.attendance)) {
          for (const a of parsed.attendance) {
            if (a.id) await setDoc(doc(db, 'attendance', a.id), a);
          }
        }

        if (parsed.finances && typeof parsed.finances === 'object') {
          for (const [wId, fin] of Object.entries(parsed.finances)) {
            await setDoc(doc(db, 'finances', wId), fin as any);
          }
        }

        if (Array.isArray(parsed.income)) {
          for (const inc of parsed.income) {
            if (inc.id) await setDoc(doc(db, 'income', inc.id), inc);
          }
        }

        if (Array.isArray(parsed.expenses)) {
          for (const exp of parsed.expenses) {
            if (exp.id) await setDoc(doc(db, 'expenses', exp.id), exp);
          }
        }

        if (parsed.company) {
          await setDoc(doc(db, 'settings', 'company'), parsed.company);
        }

        setActionMessage('🎉 ব্যাকআপ রিস্টোর সম্পূর্ণ হয়েছে! পেজ রিলোড হচ্ছে...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error(err);
        setError('রিস্টোর ফাইলটি সঠিক ফরম্যাটের নয়। ব্যাকআপ .json ফাইল নির্বাচন করুন।');
      }
    };
    reader.readAsText(file);
  };

  // Complete Wipe / Start Fresh
  const handleStartFresh = async () => {
    const confirm1 = window.confirm(
      '⚠️ সতর্কতা: আপনি কি নিশ্চিত যে ডাটাবেজের সকল কর্মী, হাজিরা, সাইট, ইনকাম ও খরচের হিসাব মুছে ফেলতে চান?\n\nএই প্রক্রিয়াটি আর ফেরানো যাবে না!'
    );
    if (!confirm1) return;

    try {
      setActionMessage('⏳ সকল ডাটা মোছা হচ্ছে...');

      const collectionsToClear = ['workers', 'sites', 'attendance', 'finances', 'income', 'expenses'];

      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, colName));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, colName, d.id));
        }
      }

      setActionMessage('🗑️ সকল ডাটা সফলভাবে মোছা হয়েছে! নতুন করে শুরু করতে পারেন।');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      console.error(err);
      setError('ডাটা মুছতে সমস্যা হয়েছে। ফায়ারবেস কানেকশন বা সিকিউরিটি রুলস যাচাই করুন।');
    }
  };

  // Demo Data Load
  const handleLoadDemoData = async () => {
    try {
      setActionMessage('⏳ ডেমো ডাটা লোড করা হচ্ছে...');

      const sampleSites = [
        { id: 'site_1', name: 'মিরপুর ১০ রেসিডেন্সিয়াল ওয়্যারিং', createdAt: new Date().toISOString() },
        { id: 'site_2', name: 'ধানমন্ডি ১৫ কমার্শিয়াল প্রজেক্ট', createdAt: new Date().toISOString() },
      ];
      for (const s of sampleSites) {
        await setDoc(doc(db, 'sites', s.id), s);
      }

      const sampleWorkers = [
        { id: 'w_1', name: 'মোঃ রফিকুল ইসলাম', role: 'ইলেকট্রিশিয়ান', phone: '01711223344', createdAt: new Date().toISOString() },
        { id: 'w_2', name: 'মোঃ সাইদুল আলম', role: 'হেল্পার', phone: '01855667788', createdAt: new Date().toISOString() },
      ];
      for (const w of sampleWorkers) {
        await setDoc(doc(db, 'workers', w.id), w);
      }

      await setDoc(doc(db, 'finances', 'w_1'), { workerId: 'w_1', rate: 900, prevDue: 0, advance: 500, paid: 0, manualDays: null, manualPayable: null });
      await setDoc(doc(db, 'finances', 'w_2'), { workerId: 'w_2', rate: 600, prevDue: 0, advance: 200, paid: 0, manualDays: null, manualPayable: null });

      setActionMessage('✅ ডেমো ডাটা সফলভাবে লোড হয়েছে!');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      console.error(err);
      setError('ডেমো ডাটা লোড করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-['Hind_Siliguri']">
      
      {/* Title Header */}
      <div className="flex items-center justify-between bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[var(--amber)]" />
            <span>সেটিংস কন্ট্রোল প্যানেল (Settings Control Panel)</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            পৃথক ট্যাবে কোম্পানি প্রোফাইল, ফায়ারবেস ক্লাউড, নোটিশ বোর্ড ও ব্যাকআপ নিয়ন্ত্রণ করুন
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-sm font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>সেটিংস সফলভাবে সেভ করা হয়েছে!</span>
        </div>
      )}

      {actionMessage && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SUB-TAB NAVIGATION BAR (Separated 5 Distinct Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[var(--bg-surface)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-md">
        <button
          type="button"
          onClick={() => setActiveSubTab('company')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeSubTab === 'company'
              ? 'bg-[var(--amber)] text-zinc-950 shadow-md'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-primary)]'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>🏢 কোম্পানি</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('theme')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeSubTab === 'theme'
              ? 'bg-[var(--amber)] text-zinc-950 shadow-md'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-primary)]'
          }`}
        >
          <Palette className="w-4 h-4 shrink-0" />
          <span>🎨 রঙের ডিজাইন</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('notices')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeSubTab === 'notices'
              ? 'bg-[var(--amber)] text-zinc-950 shadow-md'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-primary)]'
          }`}
        >
          <Bell className="w-4 h-4 shrink-0" />
          <span>📢 নোটিশ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cloud')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeSubTab === 'cloud'
              ? 'bg-[var(--amber)] text-zinc-950 shadow-md'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-primary)]'
          }`}
        >
          <Cloud className="w-4 h-4 shrink-0" />
          <span>☁️ ক্লাউড</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('backup')}
          className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeSubTab === 'backup'
              ? 'bg-[var(--amber)] text-zinc-950 shadow-md'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-primary)]'
          }`}
        >
          <FileJson className="w-4 h-4 shrink-0" />
          <span>💾 ব্যাকআপ</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: 🏢 COMPANY PROFILE & LOGO SETTINGS                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'company' && (
        <form onSubmit={handleSaveSettings} className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="space-y-1 border-b border-zinc-800 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-[var(--amber)] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--amber)]" />
              <span>🏢 কোম্পানি ও মালিকের প্রোফাইল সেটিংস</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              এখানে আপনার কোম্পানির নাম, লোগো, মালিকের নাম ও মোবাইল নম্বর পরিবর্তন করুন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Logo Upload Box */}
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-zinc-300">
                কোম্পানির লোগো (Company Logo)
              </label>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-900 p-1 border-2 border-[var(--amber)] shrink-0 overflow-hidden flex items-center justify-center">
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                </div>

                <div className="space-y-1.5 flex-1">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-[var(--amber)]" />
                    <span>লোগো সিলেক্ট করুন</span>
                    <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-zinc-400">পিএনজি / জেপিজি ইমেজ আপলোড করুন</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  অথবা লোগো লিংক (URL):
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[var(--amber)]"
                />
              </div>
            </div>

            {/* Owner Photo Box */}
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-zinc-300">
                কন্ট্রাক্টর / মালিকের ছবি
              </label>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-900 p-1 border-2 border-[var(--amber)] shrink-0 overflow-hidden flex items-center justify-center">
                  <img src={ownerPhotoUrl} alt="Owner Preview" className="w-full h-full object-cover" />
                </div>

                <div className="space-y-1.5 flex-1">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-[var(--amber)]" />
                    <span>ছবি সিলেক্ট করুন</span>
                    <input type="file" accept="image/*" onChange={handleContractorPhotoUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-zinc-400">আপনার ছবি আপলোড করুন</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  অথবা ফটো লিংক (URL):
                </label>
                <input
                  type="text"
                  value={ownerPhotoUrl}
                  onChange={(e) => setOwnerPhotoUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[var(--amber)]"
                />
              </div>
            </div>

          </div>

          {/* Company Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                কোম্পানির নাম (English)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--amber)] font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                কোম্পানির নাম (বাংলা)
              </label>
              <input
                type="text"
                required
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--amber)] font-bold"
              />
            </div>
          </div>

          {/* Owner Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>কন্ট্রাক্টর / মালিকের নাম</span>
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--amber)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>মোবাইল নম্বর</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--amber)]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>অফিস / কন্ট্রাক্টর ঠিকানা</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 hover:brightness-110 transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>প্রোফাইল সেটিংস সেভ করুন</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB: 🎨 THEME & LOGO COLOR CUSTOMIZER                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'theme' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="space-y-1 border-b border-zinc-800 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-[var(--amber)] flex items-center gap-2">
              <Palette className="w-5 h-5 text-[var(--amber)]" />
              <span>🎨 থিম ও লোগোর রঙের ডিজাইন (Logo & UI Colors)</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              আপনার কোম্পানির লোগোর রঙের সাথে মিলিয়ে পুরো অ্যাপের বোতাম, কার্ড ও অ্যাকসেন্ট রঙ পরিবর্তন করুন।
            </p>
          </div>

          {/* 1. Presets */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-300">💡 প্রস্তুতকৃত কালার প্যালেট (লোগোর রঙের সাথে মিল রেখে):</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_PRESETS.map((p) => {
                const isActive = themeCopper === p.copper && themeAmber === p.amber;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.copper, p.amber)}
                    className={`text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800 border-amber-400 shadow-lg ring-1 ring-amber-400'
                        : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-zinc-100">{p.nameBn}</p>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{p.copper} • {p.amber}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: p.copper }} />
                      <span className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: p.amber }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Manual Custom Color Pickers */}
          <form onSubmit={handleSaveCustomColors} className="p-4 bg-[var(--bg-primary)] border border-zinc-800 rounded-2xl space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <span>ম্যানুয়াল নিজস্ব কালার কোড নির্বাচন (Custom Hex / Color Picker):</span>
              </h4>
              <p className="text-[11px] text-zinc-400">
                লোগোর রঙের হেক্স কোড লিখুন অথবা কালার বক্সে ক্লিক করে পছন্দমতো রঙ সেট করুন
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  ১. প্রধান ব্র্যান্ডের রঙ (Primary Brand Color)
                </label>
                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-xl p-2">
                  <input
                    type="color"
                    value={themeCopper}
                    onChange={(e) => {
                      setThemeCopper(e.target.value);
                      applyThemeColors(e.target.value, themeAmber);
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={themeCopper}
                    onChange={(e) => {
                      setThemeCopper(e.target.value);
                      applyThemeColors(e.target.value, themeAmber);
                    }}
                    className="w-full bg-transparent text-xs font-mono font-bold text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  ২. হাইলাইট / অ্যাকসেন্ট রঙ (Accent Highlight Color)
                </label>
                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-xl p-2">
                  <input
                    type="color"
                    value={themeAmber}
                    onChange={(e) => {
                      setThemeAmber(e.target.value);
                      applyThemeColors(themeCopper, e.target.value);
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={themeAmber}
                    onChange={(e) => {
                      setThemeAmber(e.target.value);
                      applyThemeColors(themeCopper, e.target.value);
                    }}
                    className="w-full bg-transparent text-xs font-mono font-bold text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3.5 bg-zinc-900 border border-zinc-700 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 block">লাইভ প্রিভিউ (Live Preview):</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-zinc-950 font-bold text-xs shadow-md"
                  style={{ background: `linear-gradient(to right, ${themeCopper}, ${themeAmber})` }}
                >
                  নমুনা বাটন (Sample Gradient Button)
                </button>
                <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${themeAmber}20`, color: themeAmber, border: `1px solid ${themeAmber}40` }}>
                  অ্যাকসেন্ট ব্যাজ
                </span>
                <span className="text-xs font-bold" style={{ color: themeCopper }}>
                  হেডিং টেক্সট
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>কালার থিম স্থায়ীভাবে সংরক্ষণ করুন</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: 📢 NOTICE BOARD & OWNER INSTRUCTIONS FOR FOREMEN                */}
      {/* ========================================================================= */}
      {activeSubTab === 'notices' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="space-y-1 border-b border-zinc-800 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <span>📢 নোটিশ বোর্ড ও মালিকের নাইট নির্দেশনা (Notice Board)</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              রাতে বা দিনে যেকোনো সময় আপনি এখানে নির্দেশনা লিখে রাখলে, আপনার ফোরম্যান অ্যাপটি খোলামাত্রই ড্যাশবোর্ডে আপনার বার্তা দেখতে পাবে।
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                কর্মীদের ও ফোরম্যানের উদ্দেশ্যে সুবার্তা বা নির্দেশনা লিখুন:
              </label>
              <textarea
                rows={4}
                value={ownerMessage}
                onChange={(e) => setOwnerMessage(e.target.value)}
                placeholder="যেমন: আগামীকালের জন্য বিশেষ নির্দেশনা: সকল ফোরম্যান সকাল ৮ ঘটিকার মধ্যে সাইটে উপস্থিত থেকে মেটেরিয়ালস রিসিভ করুন..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-[var(--amber)] font-['Hind_Siliguri'] leading-relaxed"
              />
            </div>

            {/* Presets picker */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-400">💡 প্রস্তুতকৃত বার্তা থেকে বেছে নিন:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOwnerMessage(preset.text)}
                    className="text-left p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 transition text-xs text-zinc-300 space-y-1 cursor-pointer"
                  >
                    <p className="font-bold text-[var(--amber)]">{preset.title}</p>
                    <p className="text-[11px] text-zinc-400 italic font-['Hind_Siliguri']">&ldquo;{preset.text}&rdquo;</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 hover:brightness-110 transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-base"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>নোটিশ প্রকাশ করুন (Publish Notice)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ☁️ FIREBASE CLOUD SYNC                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'cloud' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="space-y-1 border-b border-zinc-800 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-amber-400" />
              <span>☁️ ফায়ারবেস ক্লাউড সিঙ্ক (Firebase Cloud Sync)</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              আপনার ম্যানেজমেন্ট সিস্টেমকে বিনামূল্যে ক্লাউড ফায়ারবেস ডাটাবেজের সাথে যুক্ত করে সম্পূর্ণ অনলাইন করুন।
            </p>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5">
            <label className="flex items-center gap-2.5 font-bold text-sm text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 rounded border-amber-500 text-amber-500 focus:ring-amber-400 accent-amber-500"
              />
              <span>অটোমেটিক ক্লাউড সিঙ্ক সক্রিয় করুন (Auto-Sync)</span>
            </label>
            <p className="text-xs text-zinc-300 pl-7 leading-relaxed">
              এটি পিসি এবং মোবাইল উভয় ডিভাইএসই চালু রাখুন। সক্রিয় থাকলে যেকোনো নতুন ডাটা এন্ট্রি বা ডিলিট সাথে সাথে অন্য ডিভাইসে আপডেট হয়ে যাবে।
            </p>
          </div>

          <div className="bg-[var(--bg-primary)] border border-zinc-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                <span>⚙️ ফায়ারবেস কনফিগার করুন</span>
              </span>
              <button
                type="button"
                onClick={() => setShowConfigForm(!showConfigForm)}
                className="text-xs px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold border border-zinc-700 transition"
              >
                {showConfigForm ? 'বন্ধ করুন' : 'কনফিগার করুন'}
              </button>
            </div>

            {showConfigForm && (
              <form onSubmit={handleSaveFirebaseConfig} className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Firebase API Key*</label>
                  <input
                    type="text"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Project ID*</label>
                  <input
                    type="text"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">App ID*</label>
                  <input
                    type="text"
                    required
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Auth Domain (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>💾 কনফিগারেশন সংরক্ষণ করুন (Save Config)</span>
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <span className="block text-xs font-bold text-zinc-400">অন্যান্য মোবাইলে সিঙ্ক করার উপায়:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2 px-3 rounded-xl bg-sky-950/60 border border-sky-500/40 hover:bg-sky-900/60 text-sky-300 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copySuccess ? 'কপি হয়েছে!' : '📋 লিংক কপি করুন'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="py-2 px-3 rounded-xl bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900/60 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <QrCode className="w-4 h-4" />
                  <span>🔗 QR কোড দেখান</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-bold pt-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>❓ কিভাবে ফায়ারবেস কনফিগারেশন বের করবেন?</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              className="py-3 px-4 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>☁️ ক্লাউডে আপলোড</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              className="py-3 px-4 rounded-xl bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-500/50 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>📥 ক্লাউড থেকে ডাউনলোড</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <Cloud className="w-4 h-4 text-sky-400" />
            <span>☁️ কানেকশন টেস্ট করুন (Test Connection)</span>
          </button>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>🟢 ক্লাউড সিঙ্ক সক্রিয় রয়েছে (অটোমেটিক ব্যাকআপ চালু)</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: 💾 DATA BACKUP & DATABASE CONTROLS                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="space-y-1 border-b border-zinc-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-emerald-400 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-emerald-400" />
                <span>📄 ডাটাবেজ ব্যাকআপ ও পুনরুদ্ধার (JSON)</span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                আপনার সকল ডাটা (কর্মী, হাজিরা, সাইট, ইনকাম ও খরচ) ব্যাকআপ ফাইল ফাইল হিসেবে ডাউনলোড করে নিরাপদ রাখুন।
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>📥 ব্যাকআপ ফাইল ডাউনলোড (.Json)</span>
              </button>

              <label className="w-full py-3 px-4 rounded-xl bg-red-950/20 border border-red-500/30 hover:bg-red-900/30 text-red-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer">
                <RotateCcw className="w-4 h-4" />
                <span>🔄 ব্যাকআপ রিস্টোর করুন (Restore)</span>
                <input type="file" accept=".json" onChange={handleRestoreJson} className="hidden" />
              </label>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="space-y-1 border-b border-zinc-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-amber-400" />
                <span>🗄️ সিস্টেম ডাটাবেজ কন্ট্রোল (Database Controls)</span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                এই কন্ট্রোলগুলো সতর্কতার সাথে ব্যবহার করুন। আপনি ডেমো ডাটা পরিষ্কার করতে পারেন অথবা পরীক্ষার জন্য ডেমো ডাটা রিলোড করতে পারেন।
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleStartFresh}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>🗑️ সকল ডাটা সম্পূর্ণরূপে মুছুন (Start Fresh)</span>
              </button>

              <button
                type="button"
                onClick={handleLoadDemoData}
                className="w-full py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>🔄 ডিফল্ট ডেমো ডাটা লোড করুন (Demo Data)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setName('Green Power and Construction');
                  setNameBn('গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন');
                  setLogoUrl('/logo.svg');
                  setOwnerPhotoUrl('/contractor.svg');
                  setActionMessage('⚙️ অ্যাপ সেটিংস রিসেট করা হয়েছে!');
                  setTimeout(() => setActionMessage(null), 3000);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
                <span>⚙️ অ্যাপ সেটিংস রিসেট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-amber-400">📱 অন্য মোবাইলে কানেক্ট করতে স্ক্যান করুন</h3>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
                alt="App QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <p className="text-xs text-zinc-300">
              যেকোনো মোবাইল ক্যামেরা দিয়ে QR কোডটি স্ক্যান করলেই সরাসরি এই অ্যাপে কানেক্ট হবেন।
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 text-white font-bold text-xs"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 max-w-md w-full space-y-4 relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              <span>কিভাবে ফায়ারবেস কনফিগারেশন পাবেন?</span>
            </h3>

            <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal pl-4">
              <li>Firebase Console (console.firebase.google.com) এ লগইন করুন।</li>
              <li>আপনার প্রজেক্টের Project Settings এ যান।</li>
              <li>General ট্যাবের নিচে Your Apps সেকশনে আপনার Web App নির্বাচন করুন।</li>
              <li>সেখানে থাকা SDK Setup and Configuration থেকে API Key, Project ID, App ID কপি করে এখানে বসান।</li>
            </ol>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
