import React, { useState, useMemo } from 'react';
import { Worker, Site, WorkerFinance, AttendanceRecord, IncomeRecord, ExpenseRecord, CompanySetting, QuotationRecord } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { formatMoney, formatBengaliNumber, downloadCSV, formatBengaliDate } from '../utils/formatters';
import { PieChart, Download, Printer, Filter, DollarSign, TrendingUp, TrendingDown, Edit3, RotateCcw, MessageCircle, FileSpreadsheet, Plus } from 'lucide-react';

interface SummaryProps {
  workers: Worker[];
  sites: Site[];
  finances: Record<string, WorkerFinance>;
  attendance: AttendanceRecord[];
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
  quotations?: QuotationRecord[];
  company?: CompanySetting;
  ownerName?: string;
  onSelectTab?: (tab: any) => void;
}

export const Summary: React.FC<SummaryProps> = ({
  workers,
  sites,
  finances,
  attendance,
  income,
  expenses,
  quotations = [],
  company,
  ownerName,
  onSelectTab,
}) => {
  // Month filter: '' = All time, 'YYYY-MM' = Selected month
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const handleSendWhatsAppPaySlip = (workerName: string, phone: string, days: number, rate: number, prevDue: number, payable: number, autoTaken: number, advance: number, paid: number, due: number) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;

    const text = `
🏗️ *${company?.nameBn || company?.name || 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন'}*
📜 *কর্মীর বেতন ও হিসাব স্লিপ*
--------------------------------
👤 *কর্মী:* ${workerName}
📅 *উপস্থিত দিন:* ${days} দিন (রেট: ${rate} ৳)
➕ *পূর্বের পাওনা:* ${prevDue} ৳
💵 *মোট প্রাপ্য:* ${payable} ৳
➖ *দৈনিক নেওয়া:* ${autoTaken} ৳
➖ *অগ্রিম নিয়াছেন:* ${advance} ৳
➖ *পরিশোধিত বেতন:* ${paid} ৳
--------------------------------
💰 *সর্বমোট বাকি পাওনা:* ${due} ৳

ধন্যবাদ,
${company?.ownerName || ownerName || 'মালিক/কন্ট্রাক্টর'}`;

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text.trim())}`, '_blank');
  };

  // Filtered lists based on selectedMonth
  const filteredAttendance = useMemo(() => {
    if (!selectedMonth) return attendance;
    return attendance.filter((a) => a.date.startsWith(selectedMonth));
  }, [attendance, selectedMonth]);

  const filteredIncome = useMemo(() => {
    if (!selectedMonth) return income;
    return income.filter((i) => i.date.startsWith(selectedMonth));
  }, [income, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return expenses;
    return expenses.filter((e) => e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Per-worker calculations
  const workerStats = useMemo(() => {
    return workers.map((w) => {
      const fin = finances[w.id] || {
        rate: 0,
        prevDue: 0,
        advance: 0,
        paid: 0,
        manualDays: null,
        manualPayable: null,
      };

      const wAttendance = filteredAttendance.filter((a) => a.workerId === w.id);
      
      const autoDays = wAttendance.filter((a) => a.present === 1).length;
      const days = fin.manualDays !== null && fin.manualDays !== undefined ? fin.manualDays : autoDays;

      const autoOvertime = wAttendance.reduce((acc, curr) => acc + (curr.overtime || 0), 0);
      const autoTaken = wAttendance.reduce((acc, curr) => acc + (curr.taken || 0), 0);

      const autoPayable = days * (fin.rate || 0) + autoOvertime;
      const payable = fin.manualPayable !== null && fin.manualPayable !== undefined ? fin.manualPayable : autoPayable;

      const due = payable + (fin.prevDue || 0) - (fin.advance || 0) - (fin.paid || 0) - autoTaken;

      return {
        worker: w,
        fin,
        autoDays,
        days,
        autoOvertime,
        autoTaken,
        autoPayable,
        payable,
        due,
      };
    });
  }, [workers, finances, filteredAttendance]);

  // Overall Financial Totals
  const totals = useMemo(() => {
    const totalInc = filteredIncome.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalExp = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const totalPrevDue = workerStats.reduce((acc, curr) => acc + (curr.fin.prevDue || 0), 0);
    const totalAdvance = workerStats.reduce((acc, curr) => acc + (curr.fin.advance || 0), 0);
    const totalPaid = workerStats.reduce((acc, curr) => acc + (curr.fin.paid || 0), 0);

    const totalOvertime = workerStats.reduce((acc, curr) => acc + curr.autoOvertime, 0);
    const totalTaken = workerStats.reduce((acc, curr) => acc + curr.autoTaken, 0);
    const totalPayableWage = workerStats.reduce((acc, curr) => acc + curr.payable, 0);

    // Net profit/loss = income − paid − advance − dailyTaken − expenses
    const netProfit = totalInc - totalPaid - totalAdvance - totalTaken - totalExp;

    return {
      totalInc,
      totalExp,
      totalPrevDue,
      totalAdvance,
      totalPaid,
      totalOvertime,
      totalTaken,
      totalPayableWage,
      netProfit,
    };
  }, [filteredIncome, filteredExpenses, workerStats]);

  // Per-site financial breakdown
  const siteBreakdowns = useMemo(() => {
    return sites.map((s) => {
      const sInc = filteredIncome.filter((i) => i.siteId === s.id).reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const sExp = filteredExpenses.filter((e) => e.siteId === s.id).reduce((acc, curr) => acc + (curr.amount || 0), 0);

      // Labor cost for site = sum of (1 present day * rate + overtime) for records on this site
      const sAttendance = filteredAttendance.filter((a) => a.siteId === s.id && a.present === 1);
      const sLabor = sAttendance.reduce((acc, curr) => {
        const rate = finances[curr.workerId]?.rate || 0;
        return acc + rate + (curr.overtime || 0);
      }, 0);

      const sProfit = sInc - sLabor - sExp;

      return {
        site: s,
        income: sInc,
        labor: sLabor,
        expenses: sExp,
        profit: sProfit,
      };
    });
  }, [sites, filteredIncome, filteredExpenses, filteredAttendance, finances]);

  // Handle financial cell inline editing
  const handleUpdateFinanceField = async (
    workerId: string,
    field: keyof WorkerFinance,
    rawValue: string
  ) => {
    const currentFin = finances[workerId] || {
      rate: 0,
      prevDue: 0,
      advance: 0,
      paid: 0,
      manualDays: null,
      manualPayable: null,
    };

    let newValue: number | null = null;
    if (rawValue.trim() !== '') {
      newValue = Number(rawValue);
      if (isNaN(newValue)) newValue = 0;
    }

    try {
      await setDoc(
        doc(db, 'workerFinance', workerId),
        {
          ...currentFin,
          [field]: newValue,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `workerFinance/${workerId}`);
    }
  };

  // CSV Export with UTF-8 BOM (\uFEFF)
  const handleExportCSV = () => {
    const periodLabel = selectedMonth || 'সকল সময়';

    // Workers salary summary sheet
    const salaryHeaders = [
      'কর্মীর নাম',
      'পদবী',
      'দৈনিক রেট (৳)',
      'পূর্বের পাওনা (৳)',
      'উপস্থিত দিন',
      'প্রাপ্য মজুরি (৳)',
      'দৈনিক নেওয়া (৳)',
      'অগ্রিম (৳)',
      'পরিশোধিত (৳)',
      'বাকি (৳)',
    ];

    const salaryRows = workerStats.map((s) => [
      s.worker.name,
      s.worker.role,
      s.fin.rate || 0,
      s.fin.prevDue || 0,
      s.days,
      s.payable,
      s.autoTaken,
      s.fin.advance || 0,
      s.fin.paid || 0,
      s.due,
    ]);

    downloadCSV(`Bijli_Contractor_Summary_${periodLabel}.csv`, salaryHeaders, salaryRows);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm no-print">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[var(--amber)]" />
          <label className="text-sm font-bold text-[var(--text-main)]">সময়কাল ফিল্টার:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] px-3 py-1.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--amber)]"
          />
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth('')}
              className="text-xs text-[var(--copper)] hover:underline flex items-center gap-1 ml-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>সকল সময় দেখুন</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm hover:bg-emerald-700 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>⬇ সব হিসাব ডাউনলোড করুন (CSV)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700 text-zinc-100 font-semibold text-xs sm:text-sm hover:bg-zinc-600 transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ PDF / প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* OWNER DASHBOARD HERO BANNER */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl relative overflow-hidden card-print">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--amber)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          
          {/* Contractor Photo */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-zinc-950 border-2 border-[var(--amber)] shadow-2xl overflow-hidden flex items-center justify-center">
              <img
                src={company?.ownerPhotoUrl || '/contractor.svg'}
                alt={company?.ownerName || 'কন্ট্রাক্টর'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/contractor.svg';
                }}
              />
            </div>
            <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 font-bold text-[10px] px-2.5 py-1 rounded-full shadow-lg border border-zinc-950">
              👑 মালিক ড্যাশবোর্ড
            </span>
          </div>

          {/* Company & Owner Titles */}
          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 p-1 border border-zinc-700 shrink-0 overflow-hidden flex items-center justify-center">
                <img
                  src={company?.logoUrl || '/logo.svg'}
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.svg';
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide font-sans">
                  {company?.name || 'Green Power and Construction'}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-[var(--amber)] font-['Hind_Siliguri']">
                  {company?.nameBn || 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-[var(--text-muted)]">
              <p className="text-zinc-200">
                মালিক/কন্ট্রাক্টর: <strong className="text-amber-400 font-semibold">{company?.ownerName || ownerName || 'মালিক'}</strong>
              </p>
              {company?.phone && (
                <p className="text-zinc-200">
                  মোবাইল: <strong className="text-emerald-400 font-semibold">{company.phone}</strong>
                </p>
              )}
              {company?.address && (
                <p className="text-zinc-400">
                  ঠিকানা: <span>{company.address}</span>
                </p>
              )}
            </div>

            {/* Owner Notice / Motivational Message to Workers */}
            <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-zinc-200 space-y-1 relative">
              <div className="flex items-center gap-1.5 text-[var(--amber)] font-bold text-xs">
                <span>💬 কর্মীদের উদ্দেশ্যে মালিকের বার্তা:</span>
              </div>
              <p className="italic text-zinc-300 font-['Hind_Siliguri'] leading-relaxed pl-1">
                &ldquo;{company?.ownerMessage || "কাজের নিরাপত্তা আগে, তারপর কাজ। সততা, সময়ানুবর্তিতা ও নিখুঁত ওয়্যারিংয়ের মাধ্যমে আমরা 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন' কে সামনে এগিয়ে নিয়ে যাব।"}&rdquo;
              </p>
            </div>

          </div>

        </div>
      </div>



      {/* OVERALL STATS OVERVIEW CARD */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-lg space-y-4 card-print">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2 text-lg font-bold text-[var(--amber)]">
            <PieChart className="w-5 h-5" />
            <h2>সার্বিক অর্থ হিসাব বিবরণী ({selectedMonth || 'সকল সময়'})</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] card-print">
            <span className="text-xs text-[var(--text-muted)] font-medium">মোট আয় (সাইট জমা)</span>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1">
              {formatMoney(totals.totalInc)}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] card-print">
            <span className="text-xs text-[var(--text-muted)] font-medium">মোট প্রাপ্য মজুরি</span>
            <div className="text-base sm:text-lg font-bold text-sky-400 mt-1">
              {formatMoney(totals.totalPayableWage)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              (ওভারটাইম সহ: {formatMoney(totals.totalOvertime)})
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] card-print">
            <span className="text-xs text-[var(--text-muted)] font-medium">পূর্বের মোট পাওনা</span>
            <div className="text-base sm:text-lg font-bold text-amber-400 mt-1">
              {formatMoney(totals.totalPrevDue)}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] card-print">
            <span className="text-xs text-[var(--text-muted)] font-medium">মোট দৈনিক নেওয়া টাকা</span>
            <div className="text-base sm:text-lg font-bold text-orange-400 mt-1">
              {formatMoney(totals.totalTaken)}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] card-print">
            <span className="text-xs text-[var(--text-muted)] font-medium">মোট অগ্রিম</span>
            <div className="text-base sm:text-lg font-bold text-purple-400 mt-1">
              {formatMoney(totals.totalAdvance)}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] card-print">
            <span className="text-xs text-[var(--text-muted)] font-medium">মোট পরিশোধিত মজুরি</span>
            <div className="text-base sm:text-lg font-bold text-teal-400 mt-1">
              {formatMoney(totals.totalPaid)}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] card-print">
            <span className="text-xs text-[var(--text-muted)] font-medium">সাইট খরচ (মজুরি ছাড়া)</span>
            <div className="text-base sm:text-lg font-bold text-rose-400 mt-1">
              {formatMoney(totals.totalExp)}
            </div>
          </div>

          {/* NET PROFIT / LOSS CARD */}
          <div
            className={`p-3.5 rounded-xl border card-print ${
              totals.netProfit >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <span className="text-xs font-semibold text-[var(--text-main)]">নিট লাভ / ক্ষতি</span>
            <div
              className={`text-lg sm:text-xl font-bold mt-1 flex items-center gap-1 ${
                totals.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {totals.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span>{formatMoney(totals.netProfit)}</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
              (আয় − পরিশোধ − অগ্রিম − নেওয়া − খরচ)
            </div>
          </div>
        </div>
      </div>

      {/* PER-SITE FINANCIAL BREAKDOWN CARDS */}
      <div className="space-y-3">
        <h3 className="text-md font-bold text-[var(--amber)] flex items-center gap-2">
          <span>সাইটভিত্তিক লাভ-ক্ষতির হিসাব</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {siteBreakdowns.map((sb) => (
            <div
              key={sb.site.id}
              className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-4 shadow-md space-y-3 card-print"
            >
              <div className="font-bold text-base text-[var(--amber)] border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
                <span>{sb.site.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                    sb.profit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {sb.profit >= 0 ? 'লাভ' : 'ক্ষতি'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">সাইট আয়:</span>
                  <span className="font-bold text-emerald-400">{formatMoney(sb.income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">শ্রমিক মজুরি খরচ:</span>
                  <span className="font-bold text-sky-400">{formatMoney(sb.labor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">অন্যান্য সাইট খরচ:</span>
                  <span className="font-bold text-rose-400">{formatMoney(sb.expenses)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--border-color)] text-sm font-bold">
                  <span>নিট সাইট লাভ/ক্ষতি:</span>
                  <span className={sb.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatMoney(sb.profit)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW WORK QUOTATIONS & PROPOSALS SECTION (নতুন কাজের দরপ্রস্তাব তালিকা) */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md space-y-4 card-print">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-[var(--amber)] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[var(--amber)]" />
              <span>নতুন কাজের কোটেশন ও রেট প্রস্তাবনা (Recent Work Quotations)</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              কোথায় কোথায় নতুন কাজের কোটেশন ও রেট দেওয়া হয়েছে তার তালিকা
            </p>
          </div>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('quotations')}
              className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন কোটেশন তৈরি করুন</span>
            </button>
          )}
        </div>

        {/* Quotation metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
            <span className="text-xs text-[var(--text-muted)]">মোট কোটেশন সংখ্যা</span>
            <div className="text-lg font-bold text-zinc-100 mt-0.5">
              {formatBengaliNumber(quotations.length)} টি
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
            <span className="text-xs text-[var(--text-muted)]">মোট প্রস্তাবিত কাজের দর</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {formatMoney(quotations.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0))}
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] col-span-2 sm:col-span-1">
            <span className="text-xs text-[var(--text-muted)]">অনুমোদিত কোটেশন সংখ্যা</span>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {formatBengaliNumber(quotations.filter((q) => q.status === 'অনুমোদিত').length)} টি
            </div>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold">
              <tr>
                <th className="p-3">কোটেশন নং</th>
                <th className="p-3">প্রজেক্ট / সাইট</th>
                <th className="p-3">গ্রাহক / প্রতিষ্ঠান</th>
                <th className="p-3">প্রস্তাবিত মোট দর (৳)</th>
                <th className="p-3">তারিখ</th>
                <th className="p-3 text-center">অবস্থা</th>
                <th className="p-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--text-muted)] text-xs">
                    এখনও কোনো নতুন কাজের কোটেশন তৈরি করা হয়নি। কোটেশন তৈরি করতে &quot;কোটেশন&quot; ট্যাবে যান।
                  </td>
                </tr>
              ) : (
                quotations.slice(0, 10).map((q) => (
                  <tr key={q.id} className="hover:bg-zinc-800/30 transition">
                    <td className="p-3 font-mono font-bold text-[var(--amber)]">{q.quotationNo}</td>
                    <td className="p-3 font-semibold text-zinc-100">{q.projectName}</td>
                    <td className="p-3 text-zinc-300">
                      <div>{q.clientName || '-'}</div>
                      {q.clientPhone && <div className="text-[11px] text-zinc-500">{q.clientPhone}</div>}
                    </td>
                    <td className="p-3 font-bold text-emerald-400">{formatMoney(q.totalAmount)}</td>
                    <td className="p-3 whitespace-nowrap text-zinc-400 text-xs">{formatBengaliDate(q.date)}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          q.status === 'অনুমোদিত'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : q.status === 'বাতিল'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectTab && onSelectTab('quotations')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition text-xs font-bold cursor-pointer"
                        title="কোটেশন দেখুন ও এডিট করুন"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>ওপেন / এডিট</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PER-WORKER SALARY & DUES TABLE (OWNER EDITABLE) */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md card-print">
        <div className="p-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-bold text-sm text-[var(--text-main)] flex flex-wrap items-center justify-between gap-2">
          <span>কর্মীদের বেতন ও পাওনা হিসাব তালিকা</span>
          <span className="text-xs font-normal text-[var(--amber)]">
            💡 (মালিক সরাসরি ঘরগুলিতে মান লিখে পরিবর্তন করতে পারবেন)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold">
              <tr>
                <th className="p-3.5">কর্মীর নাম</th>
                <th className="p-3.5 min-w-[110px]">পূর্বের পাওনা (৳)</th>
                <th className="p-3.5 text-center min-w-[100px]">উপস্থিত দিন</th>
                <th className="p-3.5 min-w-[110px]">প্রাপ্য (৳)</th>
                <th className="p-3.5 min-w-[110px]">দৈনিক নেওয়া (৳)</th>
                <th className="p-3.5 min-w-[110px]">অগ্রিম (৳)</th>
                <th className="p-3.5 min-w-[110px]">পরিশোধিত (৳)</th>
                <th className="p-3.5 min-w-[110px]">বাকি (৳)</th>
                <th className="p-3.5 text-center min-w-[100px]">হোয়াটসঅ্যাপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
              {workerStats.map(({ worker, fin, autoDays, days, autoTaken, payable, due }) => (
                <tr key={worker.id} className="hover:bg-zinc-800/30 transition">
                  <td className="p-3.5 font-semibold">
                    <div>{worker.name}</div>
                    <div className="text-[11px] font-normal text-[var(--text-muted)]">
                      হাজিরা রেট: {formatMoney(fin.rate)}
                    </div>
                  </td>

                  {/* Previous Dues Editable */}
                  <td className="p-3.5">
                    <input
                      type="number"
                      value={fin.prevDue ?? ''}
                      onChange={(e) => handleUpdateFinanceField(worker.id, 'prevDue', e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] p-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[var(--amber)] font-medium"
                      placeholder="0"
                    />
                  </td>

                  {/* Present Days Editable / Auto */}
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={fin.manualDays !== null ? fin.manualDays : ''}
                        onChange={(e) => handleUpdateFinanceField(worker.id, 'manualDays', e.target.value)}
                        placeholder={String(autoDays)}
                        className="w-16 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] p-1.5 rounded-lg text-xs sm:text-sm text-center focus:outline-none focus:border-[var(--amber)] font-semibold"
                        title="ম্যানুয়াল দিন বসাতে ঘরটিতে টাইপ করুন, অটোমেটিক করতে ঘর ফাঁকা রাখুন"
                      />
                    </div>
                  </td>

                  {/* Total Payable Editable / Auto */}
                  <td className="p-3.5">
                    <input
                      type="number"
                      value={fin.manualPayable !== null ? fin.manualPayable : ''}
                      onChange={(e) => handleUpdateFinanceField(worker.id, 'manualPayable', e.target.value)}
                      placeholder={String(payable)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] p-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[var(--amber)] font-bold text-sky-400"
                      title="ম্যানুয়াল মোট প্রাপ্য বসাতে টাইপ করুন, অটোমেটিকে ফিরে যেতে ঘর ফাঁকা রাখুন"
                    />
                  </td>

                  {/* Daily Cash Taken (Read-only sum of attendance taken) */}
                  <td className="p-3.5 font-bold text-amber-400">
                    {formatMoney(autoTaken)}
                  </td>

                  {/* Advance Editable */}
                  <td className="p-3.5">
                    <input
                      type="number"
                      value={fin.advance ?? ''}
                      onChange={(e) => handleUpdateFinanceField(worker.id, 'advance', e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] p-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[var(--amber)] font-medium text-purple-400"
                      placeholder="0"
                    />
                  </td>

                  {/* Paid Salary Editable */}
                  <td className="p-3.5">
                    <input
                      type="number"
                      value={fin.paid ?? ''}
                      onChange={(e) => handleUpdateFinanceField(worker.id, 'paid', e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] p-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[var(--amber)] font-medium text-teal-400"
                      placeholder="0"
                    />
                  </td>

                  {/* Net Dues (বাকি) */}
                  <td className={`p-3.5 font-bold text-sm ${due > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatMoney(due)}
                  </td>

                  {/* WhatsApp Pay Slip Share Button */}
                  <td className="p-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppPaySlip(worker.name, worker.phone, days, fin.rate, fin.prevDue || 0, payable, autoTaken, fin.advance || 0, fin.paid || 0, due)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition flex items-center justify-center gap-1 mx-auto font-bold text-xs cursor-pointer"
                      title="হোয়াটসঅ্যাপে পে-স্লিপ পাঠান"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">স্লিপ</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
