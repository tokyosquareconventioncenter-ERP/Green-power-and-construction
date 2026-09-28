import React, { useState, useEffect, useMemo } from 'react';
import { Site, CompanySetting } from '../types';
import { formatBengaliDate, formatMoney, formatBengaliNumber, numberToBengaliWords } from '../utils/formatters';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import {
  FileText,
  Printer,
  Download,
  Plus,
  Trash2,
  Save,
  MessageCircle,
  Building,
  User,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface BillItem {
  id: string;
  description: string;
  unit: string;
  qty: number;
  rate: number;
  amount: number;
}

interface SavedBill {
  id: string;
  billNo: string;
  date: string;
  billType: string;
  projectName: string;
  clientName: string;
  clientPhone: string;
  projectAddress: string;
  contractAmount: number;
  items: BillItem[];
  subtotal: number;
  prevReceived: number;
  deduction: number;
  netPayable: number;
  createdAt?: string;
}

interface ContractorBillProps {
  company: CompanySetting;
  sites: Site[];
  ownerName: string;
}

export const ContractorBill: React.FC<ContractorBillProps> = ({ company, sites, ownerName }) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Form States
  const [billNo, setBillNo] = useState(`GPC-BILL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [billDate, setBillDate] = useState(todayStr);
  const [billType, setBillType] = useState('চলমান বিল (Running Bill)');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [contractAmount, setContractAmount] = useState<number>(0);

  // Work Items Table
  const [items, setItems] = useState<BillItem[]>([
    {
      id: '1',
      description: '১ম তলা ইন্টার্নাল ওয়্যারিং ও পাইপিং কাজ',
      unit: 'স্কয়ার ফিট',
      qty: 1200,
      rate: 35,
      amount: 42000,
    },
    {
      id: '2',
      description: 'মেইন ডিবি বোর্ড ও সার্কিট ব্রেকার ইনস্টলেশন',
      unit: 'সেট',
      qty: 1,
      rate: 8000,
      amount: 8000,
    },
  ]);

  // Financial adjustments
  const [prevReceived, setPrevReceived] = useState<number>(0);
  const [deduction, setDeduction] = useState<number>(0);
  const [remarks, setRemarks] = useState('বিল প্রাপ্তির ৭ (সাত) কার্যদিবসের মধ্যে পরিশোধ করার জন্য বিনীত অনুরোধ করা হলো।');

  // Print Settings & Paper Size (A4, Legal, Letter)
  const [printMode, setPrintMode] = useState<'full_pad' | 'preprinted_pad'>('full_pad');
  const [paperSize, setPaperSize] = useState<'a4' | 'legal' | 'letter'>('a4');

  // History & Notifications
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Auto-populate when site is selected
  useEffect(() => {
    if (selectedSiteId) {
      const s = sites.find((x) => x.id === selectedSiteId);
      if (s) {
        setProjectName(s.name);
      }
    }
  }, [selectedSiteId, sites]);

  // Load saved bills from Firestore
  useEffect(() => {
    const fetchBills = async () => {
      try {
        const snap = await getDocs(collection(db, 'contractor_bills'));
        const list: SavedBill[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as SavedBill);
        });
        setSavedBills(list);
      } catch {
        // Fallback to local
      }
    };
    fetchBills();
  }, []);

  // Item row operations
  const handleItemChange = (id: string, field: 'description' | 'unit' | 'qty' | 'rate', value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'rate') {
          const q = field === 'qty' ? Number(value) || 0 : item.qty;
          const r = field === 'rate' ? Number(value) || 0 : item.rate;
          updated.amount = q * r;
        }
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: '',
        unit: 'পয়েন্ট / আইটেম',
        qty: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  const netPayable = useMemo(() => {
    const net = subtotal - (Number(prevReceived) || 0) - (Number(deduction) || 0);
    return Math.max(0, net);
  }, [subtotal, prevReceived, deduction]);

  // In Words
  const inWords = useMemo(() => {
    return numberToBengaliWords(netPayable);
  }, [netPayable]);

  // Save Bill to Firestore
  const handleSaveBill = async () => {
    try {
      setStatusMsg('বিল সংরক্ষিত হচ্ছে...');
      const billData = {
        billNo,
        date: billDate,
        billType,
        projectName,
        clientName,
        clientPhone,
        projectAddress,
        contractAmount,
        items,
        subtotal,
        prevReceived,
        deduction,
        netPayable,
        createdAt: new Date().toISOString(),
      };

      const ref = await addDoc(collection(db, 'contractor_bills'), billData);
      setSavedBills((prev) => [{ id: ref.id, ...billData }, ...prev]);

      setStatusMsg('✅ বিল সফলভাবে সংরক্ষিত হয়েছে!');
      setTimeout(() => setStatusMsg(null), 4000);
    } catch {
      setStatusMsg('❌ বিল সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  // Print Bill Pad
  const handlePrint = () => {
    window.print();
  };

  // Download / Save as PDF
  const handleDownloadPdf = () => {
    const originalTitle = document.title;
    document.title = `${company.name || 'Contractor'}_Bill_${billNo}`;
    setStatusMsg('💡 পিডিএফ সেভ করার জন্য: প্রদর্শিত উইন্ডো থেকে "Save as PDF" বা "পিডিএফ হিসেবে সংরক্ষণ" নির্বাচন করুন।');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 300);
  };

  // WhatsApp invoice to client
  const handleSendClientWhatsApp = () => {
    const cleanPhone = (clientPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;

    const itemsSummary = items
      .map((it, idx) => `${idx + 1}. ${it.description} (${it.qty} ${it.unit}) = ৳ ${it.amount}`)
      .join('\n');

    const msg = `
🏗️ *${company.nameBn || company.name}*
📋 *কাজের বিল চালান / ইনভয়েস*
----------------------------------------
📄 *বিল নং:* ${billNo}
📅 *তারিখ:* ${formatBengaliDate(billDate)}
🏢 *প্রজেক্ট:* ${projectName}
👤 *গ্রাহক / প্রতিষ্ঠান:* ${clientName || 'সম্মানিত ক্লায়েন্ট'}
📍 *কাজের সাইট:* ${projectAddress || 'সাইট ঠিকানা'}
----------------------------------------
📝 *কাজের বিবরণ:*
${itemsSummary}
----------------------------------------
💵 *মোট কাজ (সাবটোটাল):* ৳ ${subtotal}
➖ *পূর্বে প্রাপ্ত জমা:* ৳ ${prevReceived}
💰 *বর্তমান নিট প্রদেয় বিল:* ৳ ${netPayable}
কথায়: ${inWords}
----------------------------------------
বিনীত,
*${company.ownerName || ownerName || 'মালিক/কন্ট্রাক্টর'}*
${company.nameBn || company.name}
মোবাইল: ${company.phone || ''}
`;

    window.open(`https://wa.me/${phoneWithCountry || ''}?text=${encodeURIComponent(msg.trim())}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 font-['Hind_Siliguri']">
      
      {/* Top Banner / Screen View (Hidden when printing) */}
      <div className="no-print bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[var(--amber)]" />
            <span>প্রজেক্ট বিল ও কন্ট্রাক্টর প্যাড ইনভয়েস</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            ক্লায়েন্টের নিকট কাজের বিল জমা দেওয়ার জন্য প্রফেশনাল কন্ট্রাক্টর প্যাড তৈরি ও প্রিন্ট করুন
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700 cursor-pointer"
          >
            <History className="w-4 h-4 text-sky-400" />
            <span>পূর্বের বিলসমূহ ({savedBills.length})</span>
          </button>

          <button
            type="button"
            onClick={handleSaveBill}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>বিল সেভ করুন</span>
          </button>

          <button
            type="button"
            onClick={handleSendClientWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-300 text-xs font-bold transition shadow-md cursor-pointer"
            title="ক্লায়েন্টের হোয়াটসঅ্যাপে ইনভয়েস পাঠান"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>হোয়াটসঅ্যাপে পাঠান</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
            title="মোবাইল বা কম্পিউটারে PDF ফাইল হিসেবে সেভ বা ডাউনলোড করুন"
          >
            <Download className="w-4 h-4" />
            <span>PDF ডাউনলোড</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 font-bold text-xs hover:brightness-110 transition shadow-lg cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট প্যাড কপি (Print)</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="no-print p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Bill History Drawer (no-print) */}
      {showHistory && (
        <div className="no-print bg-[var(--bg-surface)] border border-sky-500/30 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>সংরক্ষিত বিলের ইতিহাস (Saved Bills)</span>
          </h3>
          {savedBills.length === 0 ? (
            <p className="text-xs text-zinc-400">কোনো বিল সেভ করা নেই।</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {savedBills.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setBillNo(b.billNo);
                    setBillDate(b.date);
                    setBillType(b.billType);
                    setProjectName(b.projectName);
                    setClientName(b.clientName);
                    setClientPhone(b.clientPhone);
                    setProjectAddress(b.projectAddress);
                    setContractAmount(b.contractAmount || 0);
                    setItems(b.items || []);
                    setPrevReceived(b.prevReceived || 0);
                    setDeduction(b.deduction || 0);
                    setShowHistory(false);
                  }}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-amber-400 transition cursor-pointer text-xs space-y-1"
                >
                  <div className="flex justify-between font-bold text-zinc-200">
                    <span>{b.billNo}</span>
                    <span className="text-emerald-400">৳ {b.netPayable}</span>
                  </div>
                  <p className="text-zinc-400">{b.projectName}</p>
                  <p className="text-[10px] text-zinc-500">{formatBengaliDate(b.date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bill Editor Inputs Form (no-print) */}
      <div className="no-print bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <span className="text-sm font-bold text-[var(--amber)]">১. বিল ও প্রজেক্ট তথ্য ইনপুট</span>
          
          {/* Print Pad Mode & Paper Size Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-700">
            <span className="text-xs font-bold text-zinc-300">প্রিন্ট মোড:</span>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="radio"
                name="print_mode"
                checked={printMode === 'full_pad'}
                onChange={() => setPrintMode('full_pad')}
                className="accent-amber-500"
              />
              <span>নতুন প্যাড সহ</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold cursor-pointer ml-1">
              <input
                type="radio"
                name="print_mode"
                checked={printMode === 'preprinted_pad'}
                onChange={() => setPrintMode('preprinted_pad')}
                className="accent-amber-500"
              />
              <span>ছাপানো প্যাডে</span>
            </label>

            <div className="h-4 w-px bg-zinc-700 mx-1 hidden sm:block" />

            <span className="text-xs font-bold text-zinc-300">কাগজের সাইজ:</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as 'a4' | 'legal' | 'letter')}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-0.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="a4">📄 A4 পেপার (Standard)</option>
              <option value="legal">📜 Legal পেপার (১৪ ইঞ্চি লম্বা)</option>
              <option value="letter">📝 Letter পেপার (১১ ইঞ্চি)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Print Page Size CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: ${paperSize} portrait;
              margin: 8mm 10mm;
            }
          }
        `}} />

        {/* Project & Client Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">সাইট নির্বাচন (ঐচ্ছিক)</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            >
              <option value="">-- নতুন প্রজেক্ট লিখুন --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">প্রজেক্টের নাম *</label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="যেমন: বাড়ি নং ১২, বনানী ওয়্যারিং"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">ক্লায়েন্ট / মালিকের নাম</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="যেমন: ইঞ্জিনিয়ার মোঃ কামাল হোসেন"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">ক্লায়েন্টের মোবাইল (WhatsApp)</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="017xxxxxxxx"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">বিল নম্বর</label>
            <input
              type="text"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">বিলের তারিখ</label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">বিলের ধরন</label>
            <select
              value={billType}
              onChange={(e) => setBillType(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            >
              <option value="চলমান বিল (Running Bill)">চলমান বিল (Running Bill)</option>
              <option value="চূড়ান্ত বিল (Final Bill)">চূড়ান্ত বিল (Final Bill)</option>
              <option value="অগ্রিম বিল (Advance Bill)">অগ্রিম বিল (Advance Bill)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">মোট চুক্তিমূল্য (৳)</label>
            <input
              type="number"
              value={contractAmount || ''}
              onChange={(e) => setContractAmount(Number(e.target.value) || 0)}
              placeholder="ঐচ্ছিক (যেমন: ৩,৫০,০০০)"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-zinc-400 font-semibold mb-1">সাইটের পূর্ণাঙ্গ ঠিকানা</label>
            <input
              type="text"
              value={projectAddress}
              onChange={(e) => setProjectAddress(e.target.value)}
              placeholder="যেমন: প্লট #৭, রোড #৪, সেক্টর #৩, উত্তরা, ঢাকা"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Work Items Table Input */}
        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">কাজের আইটেম বিবরণী ও হিসাব:</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>আইটেম যোগ করুন</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 font-bold">
                <tr>
                  <th className="p-2.5 w-10 text-center">নং</th>
                  <th className="p-2.5">কাজের বিবরণ (Description)</th>
                  <th className="p-2.5 w-28">একক (Unit)</th>
                  <th className="p-2.5 w-24">পরিমাণ (Qty)</th>
                  <th className="p-2.5 w-24">দর (Rate ৳)</th>
                  <th className="p-2.5 w-28 text-right">মোট (৳)</th>
                  <th className="p-2.5 w-12 text-center">কাটুন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="p-2 text-center font-bold text-zinc-500">{idx + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => handleItemChange(it.id, 'description', e.target.value)}
                        placeholder="কাজের বিবরণ লিখুন..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-400"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) => handleItemChange(it.id, 'unit', e.target.value)}
                        placeholder="স্কয়ার ফিট / সেট"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-400"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        value={it.qty}
                        onChange={(e) => handleItemChange(it.id, 'qty', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 text-center focus:outline-none focus:border-amber-400 font-semibold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        value={it.rate}
                        onChange={(e) => handleItemChange(it.id, 'rate', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 text-center focus:outline-none focus:border-amber-400 font-semibold"
                      />
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-400">
                      {formatMoney(it.amount)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/20 cursor-pointer"
                        title="মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Adjustments Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-800 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">পূর্বে প্রাপ্ত টাকা (Advance / Previous Paid ৳)</label>
            <input
              type="number"
              min="0"
              value={prevReceived || ''}
              onChange={(e) => setPrevReceived(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">কর্তন / সিকিউরিটি মানি (Deduction ৳)</label>
            <input
              type="number"
              min="0"
              value={deduction || ''}
              onChange={(e) => setDeduction(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-rose-400 font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">শর্তাবলী / নোট</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTRACTOR PAD PRINT PREVIEW (Clean A4 Document Output)                  */}
      {/* ========================================================================= */}
      <div className="bg-white text-zinc-950 p-6 sm:p-10 rounded-2xl shadow-2xl border border-zinc-200 space-y-6 pad-print-document font-['Hind_Siliguri']">
        
        {/* PAD HEADER: Company Logo & Details (Shown if full_pad, blank space if preprinted) */}
        {printMode === 'full_pad' ? (
          <div className="border-b-2 border-emerald-900 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border border-emerald-800 p-1 flex items-center justify-center shrink-0">
                <img
                  src={company.logoUrl || '/logo.svg'}
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.svg';
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-emerald-900 tracking-tight leading-none uppercase">
                  {company.name || 'Green Power and Construction'}
                </h1>
                <p className="text-sm font-bold text-amber-700 mt-0.5">
                  {company.nameBn || 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন'}
                </p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  সরকারি ও বেসরকারি ভবন ওয়্যারিং, সাবস্টেশন, সোলার ও কনস্ট্রাকশন ঠিকাদার
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-zinc-700 space-y-0.5 shrink-0">
              <p className="font-bold text-zinc-900">{company.ownerName || ownerName || 'প্রকৌশলী ঠিকাদার'}</p>
              <p>মোবাইল: <strong className="text-emerald-900">{company.phone || '01700000000'}</strong></p>
              <p>{company.address || 'ঢাকা, বাংলাদেশ'}</p>
            </div>
          </div>
        ) : (
          /* Blank header margin space for physical pre-printed pad */
          <div className="h-32 flex items-center justify-center text-xs text-zinc-400 border border-dashed border-zinc-300 rounded-xl no-print">
            [আপনার ছাপানো আসল প্যাডের জন্য ফাঁকা জায়গা]
          </div>
        )}

        {/* BILL TITLE BANNER */}
        <div className="flex items-center justify-between bg-zinc-100 p-3 rounded-xl border border-zinc-300">
          <div>
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">বিল চালান / ইনভয়েস</span>
            <h2 className="text-base font-black text-emerald-950">{billType}</h2>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-zinc-800">বিল নং: <span className="font-mono text-emerald-900">{billNo}</span></p>
            <p className="text-zinc-600">তারিখ: <strong className="text-zinc-900">{formatBengaliDate(billDate)}</strong></p>
          </div>
        </div>

        {/* CLIENT & PROJECT PARTICULARS */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-xl border border-zinc-200">
          <div className="space-y-1">
            <p><span className="text-zinc-500 font-semibold">গ্রাহক / প্রতিষ্ঠানের নাম:</span> <strong className="text-zinc-900">{clientName || 'সম্মানিত ক্লায়েন্ট'}</strong></p>
            <p><span className="text-zinc-500 font-semibold">মোবাইল নম্বর:</span> <strong className="text-zinc-900">{clientPhone || 'N/A'}</strong></p>
            <p><span className="text-zinc-500 font-semibold">প্রজেক্ট সাইট ঠিকানা:</span> <strong className="text-zinc-900">{projectAddress || 'সাইট ঠিকানা'}</strong></p>
          </div>

          <div className="space-y-1 text-right">
            <p><span className="text-zinc-500 font-semibold">কাজের প্রজেক্ট:</span> <strong className="text-emerald-950 font-bold">{projectName || 'সাধারণ সাইট'}</strong></p>
            {contractAmount > 0 && (
              <p><span className="text-zinc-500 font-semibold">মোট প্রজেক্ট চুক্তিমূল্য:</span> <strong className="text-zinc-900">৳ {formatBengaliNumber(contractAmount)}</strong></p>
            )}
            <p><span className="text-zinc-500 font-semibold">বিল প্রস্তুতকারক:</span> <strong className="text-zinc-900">{company.ownerName || ownerName || 'মালিক'}</strong></p>
          </div>
        </div>

        {/* ITEMS & BILL TABLE */}
        <div className="overflow-hidden border border-zinc-300 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-950 text-white font-bold">
              <tr>
                <th className="p-3 w-10 text-center">নং</th>
                <th className="p-3">কাজের বিবরণ (Description of Works)</th>
                <th className="p-3 w-28 text-center">একক (Unit)</th>
                <th className="p-3 w-24 text-center">পরিমাণ</th>
                <th className="p-3 w-24 text-center">দর (৳)</th>
                <th className="p-3 w-28 text-right">মোট টাকা (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {items.map((it, idx) => (
                <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                  <td className="p-3 text-center font-bold text-zinc-600">{idx + 1}</td>
                  <td className="p-3 font-semibold text-zinc-900">{it.description || '-'}</td>
                  <td className="p-3 text-center text-zinc-600">{it.unit}</td>
                  <td className="p-3 text-center font-bold text-zinc-800">{formatBengaliNumber(it.qty)}</td>
                  <td className="p-3 text-center font-bold text-zinc-800">{formatBengaliNumber(it.rate)}</td>
                  <td className="p-3 text-right font-black text-zinc-950">{formatMoney(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FINANCIAL SUMMARY TOTALS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="font-bold text-zinc-600 block mb-0.5">কথায় (In Words):</span>
              <p className="font-bold text-emerald-900 text-sm italic">{inWords}</p>
            </div>

            {remarks && (
              <p className="text-[11px] text-zinc-600 italic">
                <strong>শর্তাবলী/নোট:</strong> {remarks}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-xs bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div className="flex justify-between text-zinc-700">
              <span>মোট কাজের বিল (সাবটোটাল):</span>
              <span className="font-bold text-zinc-900">{formatMoney(subtotal)}</span>
            </div>

            {prevReceived > 0 && (
              <div className="flex justify-between text-zinc-700">
                <span>পূর্বে প্রাপ্ত জমা (Advance / Paid):</span>
                <span className="font-bold text-rose-600">- {formatMoney(prevReceived)}</span>
              </div>
            )}

            {deduction > 0 && (
              <div className="flex justify-between text-zinc-700">
                <span>কর্তন / সিকিউরিটি মানি:</span>
                <span className="font-bold text-rose-600">- {formatMoney(deduction)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t-2 border-emerald-950 text-sm font-black text-emerald-950">
              <span>বর্তমান নিট প্রদেয় বিল:</span>
              <span className="text-base text-emerald-900">{formatMoney(netPayable)}</span>
            </div>
          </div>
        </div>

        {/* SEAL & SIGNATURES */}
        <div className="pt-16 grid grid-cols-2 gap-8 text-xs text-center">
          <div className="space-y-1">
            <div className="border-t border-zinc-400 w-48 mx-auto pt-1 font-bold text-zinc-800">
              গ্রাহক / ক্লায়েন্টের স্বাক্ষর
            </div>
            <p className="text-[10px] text-zinc-500">স্বাক্ষর ও গ্রহণের তারিখ</p>
          </div>

          <div className="space-y-1">
            <div className="border-t border-zinc-400 w-48 mx-auto pt-1 font-bold text-zinc-900">
              কন্ট্রাক্টরের স্বাক্ষর ও সিল
            </div>
            <p className="text-[10px] text-emerald-900 font-bold">{company.nameBn || company.name}</p>
          </div>
        </div>

      </div>

    </div>
  );
};
