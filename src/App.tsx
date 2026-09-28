import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';

import {
  UserProfile,
  Worker,
  Site,
  WorkerFinance,
  AttendanceRecord,
  IncomeRecord,
  ExpenseRecord,
  CompanySetting,
} from './types';

import { Header } from './components/Header';
import { Tabs, TabType } from './components/Tabs';
import { Login } from './components/Login';
import { Attendance } from './components/Attendance';
import { Income } from './components/Income';
import { Expenses } from './components/Expenses';
import { Workers } from './components/Workers';
import { Sites } from './components/Sites';
import { Users } from './components/Users';
import { Summary } from './components/Summary';
import { Settings } from './components/Settings';
import { ContractorBill } from './components/ContractorBill';
import { Quotations } from './components/Quotations';
import { OfflineBanner } from './components/OfflineBanner';
import { Language } from './utils/i18n';
import { initThemeColors } from './utils/themeManager';
import { QuotationRecord } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Language state (বাংলা / English)
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'bn';
  });

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === 'bn' ? 'en' : 'bn';
      localStorage.setItem('app_lang', next);
      return next;
    });
  };

  // Initialize Logo Brand Theme Colors
  useEffect(() => {
    initThemeColors();
  }, []);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Auto-switch Foreman to attendance if they are on an owner-only tab
  useEffect(() => {
    if (
      userProfile?.role === 'foreman' &&
      (activeTab === 'summary' ||
        activeTab === 'workers' ||
        activeTab === 'sites' ||
        activeTab === 'users' ||
        activeTab === 'settings' ||
        activeTab === 'contractor_bill' ||
        activeTab === 'quotations')
    ) {
      setActiveTab('attendance');
    }
  }, [userProfile?.role, activeTab]);

  // App Data Collections State
  const [company, setCompany] = useState<CompanySetting>({
    name: 'Green Power and Construction',
    nameBn: 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন',
    logoUrl: '/logo.svg',
    ownerName: '',
    ownerPhotoUrl: '/contractor.svg',
    phone: '01700000000',
    address: 'ঢাকা, বাংলাদেশ',
  });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [finances, setFinances] = useState<Record<string, WorkerFinance>>({});
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Auth Listener & Local Session Handler
  useEffect(() => {
    const checkLocalUser = () => {
      const stored = localStorage.getItem('bijli_local_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUserProfile(parsed);
          setAuthLoading(false);
          return true;
        } catch {
          localStorage.removeItem('bijli_local_user');
        }
      }
      return false;
    };

    if (checkLocalUser()) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        if (!checkLocalUser()) {
          setUserProfile(null);
          setAuthLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Current User Profile from Firestore when authenticated via Firebase Auth
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile({
            uid: currentUser.uid,
            name: data.name || currentUser.displayName || 'ব্যবহারকারী',
            email: data.email || currentUser.email || '',
            role: data.role || 'foreman',
            phone: data.phone,
            photoUrl: data.photoUrl,
          });
        }
        setAuthLoading(false);
      },
      (err) => {
        console.warn('Firestore user fetch failed, keeping profile:', err);
        setAuthLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Real-time listeners for database collections when userProfile is active
  useEffect(() => {
    if (!userProfile) return;

    // 1. Settings / Company
    const companyUnsub = onSnapshot(
      doc(db, 'settings', 'company'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompany({
            name: data.name || 'Green Power and Construction',
            nameBn: data.nameBn || 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন',
            logoUrl: data.logoUrl || '/logo.svg',
            ownerName: data.ownerName || 'প্রকৌশলী গ্রীন পাওয়ার',
            ownerPhotoUrl: data.ownerPhotoUrl || '/contractor.svg',
            phone: data.phone || '01700000000',
            address: data.address || 'ঢাকা, বাংলাদেশ',
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/company')
    );

    // 2. Workers
    const workersUnsub = onSnapshot(
      collection(db, 'workers'),
      (snapshot) => {
        const list: Worker[] = snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          role: d.data().role,
          phone: d.data().phone,
          createdAt: d.data().createdAt,
        }));
        setWorkers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workers')
    );

    // 3. Sites
    const sitesUnsub = onSnapshot(
      collection(db, 'sites'),
      (snapshot) => {
        const list: Site[] = snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          createdAt: d.data().createdAt,
        }));
        setSites(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sites')
    );

    // 4. Attendance
    const attendanceUnsub = onSnapshot(
      collection(db, 'attendance'),
      (snapshot) => {
        const list: AttendanceRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          date: d.data().date,
          workerId: d.data().workerId,
          workerName: d.data().workerName,
          siteId: d.data().siteId,
          siteName: d.data().siteName,
          present: d.data().present,
          overtime: d.data().overtime,
          taken: d.data().taken,
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setAttendance(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'attendance')
    );

    // 5. Income
    const incomeUnsub = onSnapshot(
      collection(db, 'income'),
      (snapshot) => {
        const list: IncomeRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          date: d.data().date,
          siteId: d.data().siteId,
          siteName: d.data().siteName,
          amount: d.data().amount,
          note: d.data().note,
          createdBy: d.data().createdBy,
          createdAt: d.data().createdAt,
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setIncome(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'income')
    );

    // 6. Expenses
    const expensesUnsub = onSnapshot(
      collection(db, 'expenses'),
      (snapshot) => {
        const list: ExpenseRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          date: d.data().date,
          siteId: d.data().siteId,
          siteName: d.data().siteName,
          category: d.data().category,
          amount: d.data().amount,
          note: d.data().note,
          createdBy: d.data().createdBy,
          createdAt: d.data().createdAt,
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'expenses')
    );

    // Owner-Only listeners
    let financesUnsub: (() => void) | null = null;
    let usersUnsub: (() => void) | null = null;

    if (userProfile.role === 'owner') {
      // 7. Worker Finance
      financesUnsub = onSnapshot(
        collection(db, 'workerFinance'),
        (snapshot) => {
          const map: Record<string, WorkerFinance> = {};
          snapshot.docs.forEach((d) => {
            map[d.id] = {
              workerId: d.id,
              rate: d.data().rate || 0,
              prevDue: d.data().prevDue || 0,
              advance: d.data().advance || 0,
              paid: d.data().paid || 0,
              manualDays: d.data().manualDays !== undefined ? d.data().manualDays : null,
              manualPayable: d.data().manualPayable !== undefined ? d.data().manualPayable : null,
            };
          });
          setFinances(map);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'workerFinance')
      );

      // 8. Users List
      usersUnsub = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const list: UserProfile[] = snapshot.docs.map((d) => ({
            uid: d.id,
            name: d.data().name,
            email: d.data().email,
            role: d.data().role,
            phone: d.data().phone,
            photoUrl: d.data().photoUrl,
          }));
          setUsersList(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      );
    }

    // 9. Quotations (নতুন কাজের কোটেশন ও রেট প্রস্তাবনা)
    const quotationsUnsub = onSnapshot(
      collection(db, 'quotations'),
      (snapshot) => {
        const list: QuotationRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as QuotationRecord));
        list.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
        setQuotations(list);
      },
      (err) => console.error('Error listening to quotations', err)
    );

    return () => {
      companyUnsub();
      workersUnsub();
      sitesUnsub();
      attendanceUnsub();
      incomeUnsub();
      expensesUnsub();
      quotationsUnsub();
      if (financesUnsub) financesUnsub();
      if (usersUnsub) usersUnsub();
    };
  }, [currentUser, userProfile]);

  const handleSignOut = async () => {
    localStorage.removeItem('bijli_local_user');
    setUserProfile(null);
    try {
      await signOut(auth);
    } catch {
      // Ignore auth signout error
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 font-['Hind_Siliguri',sans-serif]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--amber)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Green Power & Construction লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <Login
        company={company}
        onSuccess={() => {
          const stored = localStorage.getItem('bijli_local_user');
          if (stored) {
            try {
              setUserProfile(JSON.parse(stored));
            } catch {
              // ignore
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex flex-col font-['Noto_Sans_Bengali','Anek_Bangla','Hind_Siliguri',sans-serif]">
      {/* Header */}
      <Header
        user={userProfile}
        company={company}
        onSignOut={handleSignOut}
        lang={lang}
        onToggleLang={toggleLang}
      />

      {/* Tabs */}
      <Tabs
        role={userProfile.role}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lang={lang}
      />

      {/* Main Screen Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'attendance' && (
          <Attendance
            workers={workers}
            sites={sites}
            attendance={attendance}
            role={userProfile.role}
            company={company}
          />
        )}

        {activeTab === 'income' && (
          <Income
            sites={sites}
            income={income}
            role={userProfile.role}
            userName={userProfile.name}
          />
        )}

        {activeTab === 'expenses' && (
          <Expenses
            sites={sites}
            expenses={expenses}
            role={userProfile.role}
            userName={userProfile.name}
          />
        )}

        {activeTab === 'workers' && userProfile.role === 'owner' && (
          <Workers workers={workers} finances={finances} company={company} />
        )}

        {activeTab === 'sites' && userProfile.role === 'owner' && (
          <Sites sites={sites} income={income} />
        )}

        {activeTab === 'contractor_bill' && userProfile.role === 'owner' && (
          <ContractorBill
            company={company}
            sites={sites}
            ownerName={userProfile.name}
          />
        )}

        {activeTab === 'quotations' && userProfile.role === 'owner' && (
          <Quotations
            company={company}
            sites={sites}
            ownerName={userProfile.name}
          />
        )}

        {activeTab === 'users' && userProfile.role === 'owner' && (
          <Users users={usersList} />
        )}

        {activeTab === 'summary' && userProfile.role === 'owner' && (
          <Summary
            workers={workers}
            sites={sites}
            finances={finances}
            attendance={attendance}
            income={income}
            expenses={expenses}
            quotations={quotations}
            company={company}
            ownerName={userProfile.name}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === 'settings' && userProfile.role === 'owner' && (
          <Settings
            company={company}
            user={userProfile}
            workers={workers}
            sites={sites}
            attendance={attendance}
            finances={finances}
            income={income}
            expenses={expenses}
            lang={lang}
          />
        )}
      </main>

      {/* Offline Status Banner */}
      <OfflineBanner />
    </div>
  );
}
