import React, { useState, useEffect, useMemo } from 'react';
import { Site, CompanySetting, QuotationRecord, QuotationItem } from '../types';
import { formatBengaliDate, formatMoney, formatBengaliNumber, numberToBengaliWords } from '../utils/formatters';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import {
  FileSpreadsheet,
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
  History,
  CheckCircle2,
  Pencil,
  X,
  Check
} from 'lucide-react';

interface QuotationsProps {
  company: CompanySetting;
  sites: Site[];
  ownerName: string;
}

export const Quotations: React.FC<QuotationsProps> = ({ company, sites, ownerName }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextMonthStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Form States
  const [quotationNo, setQuotationNo] = useState(`GPC-QT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(todayStr);
  const [validUntil, setValidUntil] = useState(nextMonthStr);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [status, setStatus] = useState<'পেন্ডিং' | 'অনুমোদিত' | 'বাতিল'>('পেন্ডিং');

  // Rate Items
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: '1',
      description: 'ভবনের ইন্টার্নাল পাইপ ওয়্যারিং ও সার্কিট ওয়্যার ড্রপ',
      unit: 'স্কয়ার ফিট',
      qty: 1500,
      rate: 35,
      amount: 52500,
    },
    {
      id: '2',
      description: 'মেইন ডিবি / এসডিবি প্যানেল ও সার্কিট ব্রেকার ইনস্টলেশন',
      unit: 'সেট',
      qty: 2,
      rate: 4500,
      amount: 9000,
    },
    {
      id: '3',
      description: 'লাইট-ফ্যান পয়েন্টিং ও গ্যাং সুইচ ফিটিং',
      unit: 'পয়েন্ট',
      qty: 45,
      rate: 180,
      amount: 8100,
    },
  ]);

  const [terms, setTerms] = useState(
    '১. কাজের পূর্বে ৩০% অগ্রিম, ৫০% রানিং কাজের সময় এবং বাকি ২০% ফিনিশিং শেষে প্রদেয়।\n২. সকল মালামাল (তার, পাইপ, সুইচ) মালিকপক্ষ সরবরাহ করিবেন।\n৩. এই কোটেশনের রেট আগামী ৩০ দিন পর্যন্ত বলবৎ থাকিবে।'
  );

  // Print Mode & Paper Size (A4, Legal, Letter)
  const [printMode, setPrintMode] = useState<'full_pad' | 'preprinted_pad'>('full_pad');
  const [paperSize, setPaperSize] = useState<'a4' | 'legal' | 'letter'>('a4');

  // Saved Quotations List
  const [quotationsList, setQuotationsList] = useState<QuotationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Editing existing quotation
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch quotations from Firestore
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const snap = await getDocs(collection(db, 'quotations'));
        const list: QuotationRecord[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as QuotationRecord);
        });
        setQuotationsList(list);
      } catch (err) {
        console.error('Error fetching quotations', err);
      }
    };
    fetchQuotes();
  }, []);

  // Item operations
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
  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  const inWords = useMemo(() => {
    return numberToBengaliWords(totalAmount);
  }, [totalAmount]);

  // Save / Update Quotation
  const handleSaveQuotation = async () => {
    if (!projectName.trim()) {
      setStatusMsg('❌ অনুগ্রহ করে প্রজেক্টের নাম লিখুন।');
      return;
    }

    try {
      setStatusMsg('কোটেশন সংরক্ষণ হচ্ছে...');
      const quoteData = {
        quotationNo,
        date,
        validUntil,
        projectName: projectName.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        projectAddress: projectAddress.trim(),
        items,
        totalAmount,
        terms: terms.trim(),
        status,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'quotations', editingId), quoteData);
        setQuotationsList((prev) =>
          prev.map((q) => (q.id === editingId ? { id: editingId, ...quoteData } : q))
        );
        setStatusMsg('✅ কোটেশন সফলভাবে আপডেট করা হয়েছে!');
      } else {
        const ref = await addDoc(collection(db, 'quotations'), {
          ...quoteData,
          createdAt: new Date().toISOString(),
        });
        setQuotationsList((prev) => [{ id: ref.id, ...quoteData, createdAt: new Date().toISOString() }, ...prev]);
        setEditingId(ref.id);
        setStatusMsg('✅ নতুন কোটেশন সফলভাবে সংরক্ষিত হয়েছে!');
      }

      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'quotations');
      setStatusMsg('❌ কোটেশন সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  // New Quotation form reset
  const handleNewQuotation = () => {
    setEditingId(null);
    setQuotationNo(`GPC-QT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setDate(todayStr);
    setValidUntil(nextMonthStr);
    setProjectName('');
    setClientName('');
    setClientPhone('');
    setProjectAddress('');
    setStatus('পেন্ডিং');
    setItems([
      {
        id: '1',
        description: 'ভবনের নতুন ইলেকট্রিক্যাল ওয়্যারিং কাজ',
        unit: 'স্কয়ার ফিট',
        qty: 1000,
        rate: 35,
        amount: 35000,
      },
    ]);
    setStatusMsg('নতুন কোটেশন ফর্ম প্রস্তুত করা হয়েছে।');
    setTimeout(() => setStatusMsg(null), 2500);
  };

  // Load existing quote
  const handleSelectQuote = (q: QuotationRecord) => {
    setEditingId(q.id);
    setQuotationNo(q.quotationNo);
    setDate(q.date);
    setValidUntil(q.validUntil || nextMonthStr);
    setProjectName(q.projectName);
    setClientName(q.clientName || '');
    setClientPhone(q.clientPhone || '');
    setProjectAddress(q.projectAddress || '');
    setStatus(q.status || 'পেন্ডিং');
    setItems(q.items || []);
    setTerms(q.terms || '');
    setShowHistory(false);
  };

  // Delete quote
  const handleDeleteQuote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('আপনি কি সত্যিই এই কোটেশনটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'quotations', id));
      setQuotationsList((prev) => prev.filter((q) => q.id !== id));
      if (editingId === id) handleNewQuotation();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `quotations/${id}`);
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Download PDF
  const handleDownloadPdf = () => {
    const originalTitle = document.title;
    document.title = `${company.name || 'Contractor'}_Quotation_${quotationNo}`;
    setStatusMsg('💡 পিডিএফ সেভ করার জন্য: প্রদর্শিত উইন্ডো থেকে "Save as PDF" নির্বাচন করুন।');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 300);
  };

  // WhatsApp Proposal to Client
  const handleSendClientWhatsApp = () => {
    const cleanPhone = (clientPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;

    const itemsSummary = items
      .map((it, idx) => `${idx + 1}. ${it.description} (${it.qty} ${it.unit} @ ৳${it.rate}) = ৳ ${it.amount}`)
      .join('\n');

    const msg = `
🏗️ *${company.nameBn || company.name}*
📋 *নতুন কাজের কোটেশন ও রেট প্রস্তাবনা*
----------------------------------------
📄 *কোটেশন নং:* ${quotationNo}
📅 *তারিখ:* ${formatBengaliDate(date)}
🏢 *কাজের প্রজেক্ট:* ${projectName}
👤 *গ্রাহক / প্রতিষ্ঠান:* ${clientName || 'সম্মানিত ক্লায়েন্ট'}
📍 *সাইটের অবস্থান:* ${projectAddress || 'সাইট ঠিকানা'}
----------------------------------------
📝 *কাজের বিবরণ ও প্রস্তাবিত রেট:*
${itemsSummary}
----------------------------------------
💰 *সর্বমোট প্রাক্কলিত দর:* ৳ ${totalAmount}
কথায়: ${inWords}
----------------------------------------
📌 *শর্তাবলী:*
${terms}
----------------------------------------
বিনীত,
*${company.ownerName || ownerName || 'মালিক/কন্ট্রাক্টর'}*
${company.nameBn || company.name}
মোবাইল: ${company.phone || ''}
`;

    window.open(`https://wa.me/${phoneWithCountry || ''}?text=${encodeURIComponent(msg.trim())}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 font-['Noto_Sans_Bengali','Anek_Bangla',sans-serif]">
      {/* Top Banner (No-Print) */}
      <div className="no-print bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[var(--amber)]" />
            <span>নতুন কাজের কোটেশন ও রেট প্রস্তাবনা (Work Quotations)</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            নতুন প্রজেক্ট বা কাজের জন্য কন্ট্রাক্টরের নিজস্ব প্যাডে দরপ্রস্তাব তৈরি ও প্রিন্ট করুন
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleNewQuotation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>নতুন কোটেশন</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700 cursor-pointer"
          >
            <History className="w-4 h-4 text-sky-400" />
            <span>সকল কোটেশন ({quotationsList.length})</span>
          </button>

          <button
            type="button"
            onClick={handleSaveQuotation}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{editingId ? 'আপডেট করুন' : 'কোটেশন সেভ'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendClientWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-300 text-xs font-bold transition shadow-md cursor-pointer"
            title="ক্লায়েন্টের হোয়াটসঅ্যাপে কোটেশন পাঠান"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
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
            <span>প্রিন্ট প্যাড কপি</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="no-print p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* History Drawer (no-print) */}
      {showHistory && (
        <div className="no-print bg-[var(--bg-surface)] border border-sky-500/30 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>পূর্বে জমা দেওয়া কোটেশন সমূহ (Submitted Quotations)</span>
          </h3>
          {quotationsList.length === 0 ? (
            <p className="text-xs text-zinc-400">কোনো কোটেশন এখনও সেভ করা হয়নি।</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {quotationsList.map((q) => (
                <div
                  key={q.id}
                  onClick={() => handleSelectQuote(q)}
                  className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-amber-400 transition cursor-pointer text-xs space-y-1.5 relative group"
                >
                  <div className="flex justify-between font-bold text-zinc-200">
                    <span>{q.quotationNo}</span>
                    <span className="text-emerald-400">{formatMoney(q.totalAmount)}</span>
                  </div>
                  <p className="text-zinc-300 font-semibold">{q.projectName}</p>
                  <div className="flex justify-between items-center text-[11px] text-zinc-400 pt-1">
                    <span>{q.clientName || 'ক্লায়েন্ট'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                      {q.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                    <span>{formatBengaliDate(q.date)}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteQuote(q.id, e)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inputs Form (no-print) */}
      <div className="no-print bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <span className="text-sm font-bold text-[var(--amber)]">১. প্রজেক্ট ও ক্লায়েন্ট তথ্য</span>
          
          <div className="flex flex-wrap items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-700">
            <span className="text-xs font-bold text-zinc-300">প্রিন্ট মোড:</span>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="radio"
                name="quote_print_mode"
                checked={printMode === 'full_pad'}
                onChange={() => setPrintMode('full_pad')}
                className="accent-amber-500"
              />
              <span>ডিজিটাল প্যাড সহ</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold cursor-pointer ml-1">
              <input
                type="radio"
                name="quote_print_mode"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">কাজের প্রজেক্টের নাম *</label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="যেমন: ৩ তলা ডুপ্লেক্স ভবনের ওয়্যারিং"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">ক্লায়েন্ট / মালিকের নাম</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="যেমন: ইঞ্জিঃ তানভীর আহমেদ"
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
            <label className="block text-zinc-400 font-semibold mb-1">কোটেশনের অবস্থা (Status)</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400 font-bold"
            >
              <option value="পেন্ডিং">পেন্ডিং (চলমান দরপ্রস্তাব)</option>
              <option value="অনুমোদিত">অনুমোদিত (ক্লায়েন্ট গ্রহণ করেছেন)</option>
              <option value="বাতিল">বাতিল</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">কোটেশন নম্বর</label>
            <input
              type="text"
              value={quotationNo}
              onChange={(e) => setQuotationNo(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">প্রস্তাবের তারিখ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">কার্যকর মেয়াদ (Valid Until)</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">সাইটের পূর্ণাঙ্গ ঠিকানা</label>
            <input
              type="text"
              value={projectAddress}
              onChange={(e) => setProjectAddress(e.target.value)}
              placeholder="প্লট #১২, রোড #৩, ধানমন্ডি, ঢাকা"
              className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Rate Items Input */}
        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">কাজের বিবরণী ও প্রস্তাবিত রেট তালিকা:</span>
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
                  <th className="p-2.5">কাজের বিবরণ (Description of Work)</th>
                  <th className="p-2.5 w-28">একক (Unit)</th>
                  <th className="p-2.5 w-24">পরিমাণ (Qty)</th>
                  <th className="p-2.5 w-24">দর / রেট (৳)</th>
                  <th className="p-2.5 w-28 text-right">মোট (৳)</th>
                  <th className="p-2.5 w-12 text-center">মুছুন</th>
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
                        placeholder="কাজের আইটেম লিখুন..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-400"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) => handleItemChange(it.id, 'unit', e.target.value)}
                        placeholder="স্কয়ার ফিট / সেট / জব"
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

        <div>
          <label className="block text-zinc-400 font-semibold mb-1 text-xs">কাজের শর্তাবলী (Terms & Conditions)</label>
          <textarea
            rows={3}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400 text-xs"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUOTATION PAD PRINT PREVIEW (Clean A4 Document Output)                     */}
      {/* ========================================================================= */}
      <div className="bg-white text-zinc-950 p-6 sm:p-10 rounded-2xl shadow-2xl border border-zinc-200 space-y-6 pad-print-document font-['Noto_Sans_Bengali','Anek_Bangla',sans-serif]">
        
        {/* Header: Shown if full_pad, blank margin if preprinted */}
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
          <div className="h-32 flex items-center justify-center text-xs text-zinc-400 border border-dashed border-zinc-300 rounded-xl no-print">
            [আপনার ছাপানো আসল প্যাডের জন্য ফাঁকা জায়গা]
          </div>
        )}

        {/* QUOTATION TITLE BANNER */}
        <div className="flex items-center justify-between bg-zinc-100 p-3 rounded-xl border border-zinc-300">
          <div>
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">দরপ্রস্তাব / কোটেশন চালান</span>
            <h2 className="text-base font-black text-emerald-950">কাজের কোটেশন ও রেট প্রস্তাবনা</h2>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-zinc-800">কোটেশন নং: <span className="font-mono text-emerald-900">{quotationNo}</span></p>
            <p className="text-zinc-600">তারিখ: <strong className="text-zinc-900">{formatBengaliDate(date)}</strong></p>
          </div>
        </div>

        {/* CLIENT & PROJECT PARTICULARS */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-xl border border-zinc-200">
          <div className="space-y-1">
            <p><span className="text-zinc-500 font-semibold">গ্রাহক / প্রতিষ্ঠানের নাম:</span> <strong className="text-zinc-900">{clientName || 'সম্মানিত ক্লায়েন্ট'}</strong></p>
            <p><span className="text-zinc-500 font-semibold">মোবাইল নম্বর:</span> <strong className="text-zinc-900">{clientPhone || 'N/A'}</strong></p>
            <p><span className="text-zinc-500 font-semibold">কাজের সাইট ঠিকানা:</span> <strong className="text-zinc-900">{projectAddress || 'সাইট ঠিকানা'}</strong></p>
          </div>

          <div className="space-y-1 text-right">
            <p><span className="text-zinc-500 font-semibold">প্রস্তাবিত কাজের প্রজেক্ট:</span> <strong className="text-emerald-950 font-bold">{projectName || 'সাধারণ সাইট'}</strong></p>
            <p><span className="text-zinc-500 font-semibold">কোটেশন প্রস্তাবক:</span> <strong className="text-zinc-900">{company.ownerName || ownerName || 'মালিক/কন্ট্রাক্টর'}</strong></p>
            {validUntil && (
              <p><span className="text-zinc-500 font-semibold">কার্যকর মেয়াদ:</span> <strong className="text-zinc-900">{formatBengaliDate(validUntil)} পর্যন্ত</strong></p>
            )}
          </div>
        </div>

        {/* ITEMS & RATE TABLE */}
        <div className="overflow-hidden border border-zinc-300 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-950 text-white font-bold">
              <tr>
                <th className="p-3 w-10 text-center">নং</th>
                <th className="p-3">কাজের বিবরণ (Description of Works)</th>
                <th className="p-3 w-28 text-center">একক (Unit)</th>
                <th className="p-3 w-24 text-center">পরিমাণ</th>
                <th className="p-3 w-24 text-center">প্রস্তাবিত দর (৳)</th>
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

        {/* TOTALS & TERMS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="font-bold text-zinc-600 block mb-0.5">কথায় (In Words):</span>
              <p className="font-bold text-emerald-900 text-sm italic">{inWords}</p>
            </div>

            {terms && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-700 whitespace-pre-line leading-relaxed">
                <strong className="text-zinc-900 block mb-1">কাজের সাধারণ শর্তাবলী:</strong>
                {terms}
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div className="flex justify-between items-center text-base font-black text-emerald-950 pt-2 border-t-2 border-emerald-950">
              <span>সর্বমোট প্রাক্কলিত দর:</span>
              <span className="text-lg text-emerald-900">{formatMoney(totalAmount)}</span>
            </div>
            <p className="text-[11px] text-zinc-500 text-right italic">
              * ভ্যাট/ট্যাক্স ব্যতিরেকে প্রাক্কলিত দর
            </p>
          </div>
        </div>

        {/* SEAL & SIGNATURES */}
        <div className="pt-16 grid grid-cols-2 gap-8 text-xs text-center">
          <div className="space-y-1">
            <div className="border-t border-zinc-400 w-48 mx-auto pt-1 font-bold text-zinc-800">
              ক্লায়েন্ট / প্রজেক্ট মালিকের স্বাক্ষর
            </div>
            <p className="text-[10px] text-zinc-500">অনুমোদনের স্বাক্ষর ও সিল</p>
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
