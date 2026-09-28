import React, { useState, useEffect, useMemo } from 'react';
import { Worker, Site, AttendanceRecord, UserRole, CompanySetting } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { formatBengaliDate, formatMoney, formatBengaliNumber } from '../utils/formatters';
import { Calendar, Save, Trash2, CheckCircle2, XCircle, Grid, List, PlusCircle, Bell, MessageCircle, Pencil, X, Check } from 'lucide-react';

interface AttendanceProps {
  workers: Worker[];
  sites: Site[];
  attendance: AttendanceRecord[];
  role: UserRole;
  company?: CompanySetting;
}

export const Attendance: React.FC<AttendanceProps> = ({ workers, sites, attendance, role, company }) => {
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'grid' | 'recent'>('daily');

  // Edit Single Record State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSiteId, setEditSiteId] = useState('');
  const [editPresent, setEditPresent] = useState(true);
  const [editOvertime, setEditOvertime] = useState('');
  const [editTaken, setEditTaken] = useState('');
  const [updatingRecord, setUpdatingRecord] = useState(false);

  const handleStartEditRecord = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditDate(rec.date);
    setEditSiteId(rec.siteId || '');
    setEditPresent(rec.present === 1);
    setEditOvertime(String(rec.overtime || 0));
    setEditTaken(String(rec.taken || 0));
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setUpdatingRecord(true);
    try {
      const targetSite = sites.find((s) => s.id === editSiteId);
      const updateData = {
        date: editDate,
        workerId: editingRecord.workerId,
        workerName: editingRecord.workerName || '',
        siteId: editSiteId,
        siteName: targetSite ? targetSite.name : '',
        present: editPresent ? 1 : 0,
        overtime: Number(editOvertime) || 0,
        taken: Number(editTaken) || 0,
      };

      if (editDate !== editingRecord.date) {
        // Date changed - move record
        const newDocId = `${editDate}_${editingRecord.workerId}`;
        await setDoc(doc(db, 'attendance', newDocId), updateData);
        await deleteDoc(doc(db, 'attendance', editingRecord.id));
      } else {
        await updateDoc(doc(db, 'attendance', editingRecord.id), updateData);
      }
      setEditingRecord(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${editingRecord.id}`);
    } finally {
      setUpdatingRecord(false);
    }
  };

  const handleSendWorkerAttendanceWhatsApp = (w: Worker) => {
    const cleanPhone = (w.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const item = dailyData[w.id];
    const text = `
🏗️ *${company?.nameBn || company?.name || 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন'}*
📅 *তারিখ:* ${formatBengaliDate(selectedDate)}
👤 *কর্মী:* ${w.name} (${w.role})
✅ *হাজিরা:* ${item?.present ? 'উপস্থিত' : 'অনুপস্থিত'}
⏰ *ওভারটাইম:* ৳ ${item?.overtime || 0}
💵 *দৈনিক খোরাকি/নেওয়া:* ৳ ${item?.taken || 0}

ধন্যবাদ,
${company?.ownerName || 'মালিক/কন্ট্রাক্টর'}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text.trim())}`, '_blank');
  };

  // Daily Entry state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dailyData, setDailyData] = useState<
    Record<string, { siteId: string; present: boolean; overtime: number; taken: number }>
  >({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Month Picker state for 31-day grid
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Find last used site for each worker from recent attendance
  const lastUsedSites = useMemo(() => {
    const map: Record<string, string> = {};
    // Sort attendance descending
    const sorted = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    sorted.forEach((rec) => {
      if (!map[rec.workerId] && rec.siteId) {
        map[rec.workerId] = rec.siteId;
      }
    });
    return map;
  }, [attendance]);

  // Load daily attendance whenever date or workers change
  useEffect(() => {
    const defaultSiteId = sites.length > 0 ? sites[0].id : '';
    const initial: Record<string, { siteId: string; present: boolean; overtime: number; taken: number }> = {};

    workers.forEach((w) => {
      const existingDoc = attendance.find((a) => a.date === selectedDate && a.workerId === w.id);
      if (existingDoc) {
        initial[w.id] = {
          siteId: existingDoc.siteId || defaultSiteId,
          present: existingDoc.present === 1,
          overtime: existingDoc.overtime || 0,
          taken: existingDoc.taken || 0,
        };
      } else {
        initial[w.id] = {
          siteId: lastUsedSites[w.id] || defaultSiteId,
          present: true,
          overtime: 0,
          taken: 0,
        };
      }
    });

    setDailyData(initial);
  }, [selectedDate, workers, attendance, sites, lastUsedSites]);

  const handleFieldChange = (workerId: string, field: 'siteId' | 'present' | 'overtime' | 'taken', value: any) => {
    setDailyData((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [field]: value,
      },
    }));
  };

  const handleSaveDailyAttendance = async () => {
    if (!selectedDate) return;
    try {
      const batch = writeBatch(db);

      workers.forEach((w) => {
        const item = dailyData[w.id];
        if (!item) return;

        const docId = `${selectedDate}_${w.id}`;
        const ref = doc(db, 'attendance', docId);

        const targetSite = sites.find((s) => s.id === item.siteId);

        batch.set(ref, {
          date: selectedDate,
          workerId: w.id,
          workerName: w.name,
          siteId: item.siteId || '',
          siteName: targetSite ? targetSite.name : '',
          present: item.present ? 1 : 0,
          overtime: Number(item.overtime) || 0,
          taken: Number(item.taken) || 0,
        });
      });

      await batch.commit();
      setSaveSuccessMsg(`${formatBengaliDate(selectedDate)}-এর হাজিরা সফলভাবে সংরক্ষিত হয়েছে!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance');
    }
  };

  const handleDeleteAttendance = async (docId: string) => {
    if (role !== 'owner') return;
    if (!window.confirm('আপনি কি সত্যিই এই হাজিরার তথ্য মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'attendance', docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `attendance/${docId}`);
    }
  };

  // 31 days month grid calculations
  const monthDaysCount = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return 30;
    return new Date(y, m, 0).getDate(); // Get last day of month
  }, [selectedMonth]);

  const monthAttendanceMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendance.forEach((rec) => {
      if (rec.date.startsWith(selectedMonth)) {
        map[`${rec.date}_${rec.workerId}`] = rec;
      }
    });
    return map;
  }, [attendance, selectedMonth]);

  // Handle cell cycle: blank -> present -> absent -> blank
  const handleCellClick = async (worker: Worker, dayNum: number) => {
    const dayStr = String(dayNum).padStart(2, '0');
    const fullDate = `${selectedMonth}-${dayStr}`;
    const docId = `${fullDate}_${worker.id}`;
    const existing = monthAttendanceMap[docId];

    const defaultSiteId = lastUsedSites[worker.id] || (sites.length > 0 ? sites[0].id : '');
    const targetSite = sites.find((s) => s.id === defaultSiteId);

    try {
      if (!existing) {
        // Blank -> Present
        await setDoc(doc(db, 'attendance', docId), {
          date: fullDate,
          workerId: worker.id,
          workerName: worker.name,
          siteId: defaultSiteId,
          siteName: targetSite ? targetSite.name : '',
          present: 1,
          overtime: 0,
          taken: 0,
        });
      } else if (existing.present === 1) {
        // Present -> Absent (update present=0 so overtime is kept)
        await updateDoc(doc(db, 'attendance', docId), {
          present: 0,
        });
      } else {
        // Absent -> Blank (delete doc)
        await deleteDoc(doc(db, 'attendance', docId));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${docId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-card)] p-2 rounded-2xl border border-[var(--border-color)]">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'daily'
                ? 'bg-[var(--copper)] text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>দৈনিক হাজিরা যোগ করুন</span>
          </button>

          <button
            onClick={() => setActiveSubTab('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'grid'
                ? 'bg-[var(--copper)] text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>৩১ দিনের হাজিরার ঘর</span>
          </button>

          <button
            onClick={() => setActiveSubTab('recent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeSubTab === 'recent'
                ? 'bg-[var(--copper)] text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            <List className="w-4 h-4" />
            <span>সাম্প্রতিক হাজিরা</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* OWNER NOTICE / NIGHT INSTRUCTION BANNER (Prominently visible to Foreman & Workers) */}
      {company?.ownerMessage && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/10 border border-amber-500/40 rounded-2xl text-xs space-y-1.5 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Bell className="w-4 h-4 text-amber-400 shrink-0" />
            <span>📢 কর্মীদের উদ্দেশ্যে মালিকের বিশেষ নির্দেশনা (Owner Notice):</span>
          </div>
          <p className="text-zinc-200 font-semibold leading-relaxed pl-6 font-['Hind_Siliguri'] text-sm">
            &ldquo;{company.ownerMessage}&rdquo;
          </p>
        </div>
      )}

      {/* SECTION 1: DAILY ATTENDANCE FORM */}
      {activeSubTab === 'daily' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--amber)]" />
              <label className="text-sm font-bold text-[var(--text-main)]">তারিখ নির্বাচন করুন:</label>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--amber)]"
            />
          </div>

          {workers.length === 0 ? (
            <div className="text-center p-8 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] text-[var(--text-muted)]">
              কোনো কর্মী যুক্ত করা হয়নি। আগে কর্মী ট্যাবে গিয়ে কর্মী যুক্ত করুন।
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold">
                    <tr>
                      <th className="p-3.5 min-w-[140px]">কর্মীর নাম</th>
                      <th className="p-3.5 min-w-[150px]">সাইট</th>
                      <th className="p-3.5 text-center min-w-[90px]">উপস্থিত</th>
                      <th className="p-3.5 min-w-[120px]">ওভারটাইম (৳)</th>
                      <th className="p-3.5 min-w-[130px]">দৈনিক নেওয়া (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                    {workers.map((worker) => {
                      const item = dailyData[worker.id] || {
                        siteId: '',
                        present: true,
                        overtime: 0,
                        taken: 0,
                      };

                      return (
                        <tr key={worker.id} className="hover:bg-zinc-800/30 transition">
                          <td className="p-3.5 font-semibold">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-[var(--text-main)]">{worker.name}</div>
                                <span className="text-[11px] font-normal text-[var(--text-muted)]">
                                  {worker.role}
                                </span>
                              </div>
                              {worker.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWorkerAttendanceWhatsApp(worker)}
                                  className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition shrink-0 cursor-pointer"
                                  title="আজকের হাজিরার তথ্য হোয়াটসঅ্যাপে পাঠান"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Site selection */}
                          <td className="p-3.5">
                            <select
                              value={item.siteId}
                              onChange={(e) => handleFieldChange(worker.id, 'siteId', e.target.value)}
                              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] p-2 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[var(--amber)]"
                            >
                              <option value="">সাইট নির্বাচন করুন</option>
                              {sites.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Present Checkbox */}
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.present}
                              onChange={(e) => handleFieldChange(worker.id, 'present', e.target.checked)}
                              className="w-5 h-5 accent-[var(--amber)] cursor-pointer rounded"
                            />
                          </td>

                          {/* Overtime BDT */}
                          <td className="p-3.5">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={item.overtime || ''}
                              onChange={(e) =>
                                handleFieldChange(worker.id, 'overtime', e.target.value === '' ? 0 : Number(e.target.value))
                              }
                              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] p-2 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[var(--amber)]"
                            />
                          </td>

                          {/* Daily Cash Taken BDT */}
                          <td className="p-3.5">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={item.taken || ''}
                              onChange={(e) =>
                                handleFieldChange(worker.id, 'taken', e.target.value === '' ? 0 : Number(e.target.value))
                              }
                              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] p-2 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[var(--amber)]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex justify-end">
                <button
                  onClick={handleSaveDailyAttendance}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 font-bold hover:brightness-110 active:scale-95 transition shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  <span>এই তারিখের হাজিরা সংরক্ষণ করুন</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: 31 DAYS ATTENDANCE GRID */}
      {activeSubTab === 'grid' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--amber)]" />
              <label className="text-sm font-bold text-[var(--text-main)]">মাস নির্বাচন করুন:</label>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-main)] px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--amber)]"
            />
          </div>

          <div className="text-xs text-[var(--text-muted)] flex items-center gap-3 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] flex-wrap">
            <span>ক্লিক করুন:</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-[10px]">✓</span> উপস্থিত
            </span>
            <span className="flex items-center gap-1 text-red-400 font-medium">
              <span className="w-4 h-4 rounded bg-red-500/20 border border-red-500 flex items-center justify-center text-[10px]">✕</span> অনুপস্থিত
            </span>
            <span className="flex items-center gap-1 text-zinc-400 font-medium">
              <span className="w-4 h-4 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px]">-</span> খালি (মুছে ফেলুন)
            </span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] font-bold">
                  <tr>
                    <th className="p-3 text-left sticky left-0 z-20 bg-[var(--bg-primary)] border-r border-b border-[var(--border-color)] min-w-[130px]">
                      কর্মীর নাম
                    </th>
                    {Array.from({ length: monthDaysCount }, (_, i) => i + 1).map((d) => (
                      <th
                        key={d}
                        className="p-2 min-w-[32px] border-r border-b border-[var(--border-color)] font-mono text-[11px]"
                      >
                        {d}
                      </th>
                    ))}
                    <th className="p-3 sticky right-0 z-20 bg-[var(--bg-primary)] border-l border-b border-[var(--border-color)] min-w-[60px]">
                      মোট
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {workers.map((w) => {
                    let totalPresent = 0;

                    return (
                      <tr key={w.id} className="hover:bg-zinc-800/20 transition">
                        <td className="p-3 text-left font-semibold text-[var(--text-main)] sticky left-0 z-10 bg-[var(--bg-surface)] border-r border-[var(--border-color)] shadow-xs">
                          {w.name}
                        </td>

                        {Array.from({ length: monthDaysCount }, (_, i) => i + 1).map((day) => {
                          const dayStr = String(day).padStart(2, '0');
                          const docId = `${selectedMonth}-${dayStr}_${w.id}`;
                          const rec = monthAttendanceMap[docId];

                          let cellContent = '-';
                          let cellBg = 'bg-zinc-800/30 text-zinc-500 hover:bg-zinc-700/50';

                          if (rec) {
                            if (rec.present === 1) {
                              totalPresent += 1;
                              cellContent = '✓';
                              cellBg = 'bg-emerald-500/25 text-emerald-400 font-bold border border-emerald-500/50 hover:bg-emerald-500/40';
                            } else {
                              cellContent = '✕';
                              cellBg = 'bg-red-500/25 text-red-400 font-bold border border-red-500/50 hover:bg-red-500/40';
                            }
                          }

                          return (
                            <td
                              key={day}
                              onClick={() => handleCellClick(w, day)}
                              className={`p-2 cursor-pointer border-r border-[var(--border-color)] transition select-none ${cellBg}`}
                              title={`${w.name} - ${day} তারিখ`}
                            >
                              {cellContent}
                            </td>
                          );
                        })}

                        <td className="p-3 font-bold text-[var(--amber)] sticky right-0 z-10 bg-[var(--bg-surface)] border-l border-[var(--border-color)]">
                          {formatBengaliNumber(totalPresent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: RECENT ATTENDANCE RECORDS */}
      {activeSubTab === 'recent' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md">
          <div className="p-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-bold text-sm text-[var(--text-main)]">
            সাম্প্রতিক ৬০টি হাজিরার তথ্য
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold">
                <tr>
                  <th className="p-3.5">তারিখ</th>
                  <th className="p-3.5">কর্মী</th>
                  <th className="p-3.5">সাইট</th>
                  <th className="p-3.5 text-center">অবস্থা</th>
                  <th className="p-3.5">ওভারটাইম</th>
                  <th className="p-3.5">দৈনিক নেওয়া</th>
                  {role === 'owner' && <th className="p-3.5 text-center">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                      কোনো হাজিরার তথ্য পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  attendance.slice(0, 60).map((rec) => (
                    <tr key={rec.id} className="hover:bg-zinc-800/30 transition">
                      <td className="p-3.5 whitespace-nowrap font-medium">
                        {formatBengaliDate(rec.date)}
                      </td>
                      <td className="p-3.5 font-semibold">{rec.workerName || 'অজানা'}</td>
                      <td className="p-3.5 text-[var(--text-muted)]">{rec.siteName || 'সাধারণ'}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            rec.present === 1
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {rec.present === 1 ? 'উপস্থিত' : 'অনুপস্থিত'}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">{formatMoney(rec.overtime)}</td>
                      <td className="p-3.5 font-medium text-amber-400">{formatMoney(rec.taken)}</td>
                      {role === 'owner' && (
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditRecord(rec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition text-xs font-bold cursor-pointer"
                              title="হাজিরা তথ্য সম্পাদনা / ইডিট"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>ইডিট</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttendance(rec.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition text-xs font-bold cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>মুছুন</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Attendance Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--amber)] flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                <span>হাজিরার তথ্য সম্পাদনা (Edit Attendance)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4 text-xs">
              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 space-y-1">
                <p className="text-zinc-400">কর্মী: <strong className="text-zinc-100">{editingRecord.workerName}</strong></p>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">তারিখ পরিবর্তন (Date)</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">সাইট নির্বাচন</label>
                <select
                  value={editSiteId}
                  onChange={(e) => setEditSiteId(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="">সাইট নির্বাচন করুন</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <input
                  type="checkbox"
                  id="edit_present"
                  checked={editPresent}
                  onChange={(e) => setEditPresent(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="edit_present" className="text-zinc-200 font-semibold cursor-pointer">
                  কর্মী কি এই তারিখে উপস্থিত ছিলেন?
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">ওভারটাইম (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={editOvertime}
                    onChange={(e) => setEditOvertime(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">দৈনিক নেওয়া / খোরাকি (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={editTaken}
                    onChange={(e) => setEditTaken(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={updatingRecord}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{updatingRecord ? 'আপডেট হচ্ছে...' : 'আপডেট সেভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
