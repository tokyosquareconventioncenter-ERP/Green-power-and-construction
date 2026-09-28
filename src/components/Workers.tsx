import React, { useState } from 'react';
import { Worker, WorkerRole, WorkerFinance } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, setDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../utils/formatters';
import { Users, UserPlus, Trash2, Phone, Briefcase, DollarSign, User, MessageCircle, Pencil, X, Check } from 'lucide-react';
import { CompanySetting } from '../types';

interface WorkersProps {
  workers: Worker[];
  finances: Record<string, WorkerFinance>;
  company?: CompanySetting;
}

export const Workers: React.FC<WorkersProps> = ({ workers, finances, company }) => {
  const [name, setName] = useState('');

  const handleSendWhatsApp = (w: Worker, dailyRate: number) => {
    const cleanPhone = (w.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const text = `
🏗️ *${company?.nameBn || company?.name || 'গ্রীন পাওয়ার এন্ড কনস্ট্রাকশন'}*
👤 *কর্মী:* ${w.name} (${w.role})
💵 *দৈনিক হাজিরা মজুরি:* ${dailyRate} ৳
📞 *মোবাইল:* ${w.phone || 'N/A'}

সহযোগিতার জন্য ধন্যবাদ,
${company?.ownerName || 'মালিক/কন্ট্রাক্টর'}`;

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text.trim())}`, '_blank');
  };
  const [role, setRole] = useState<WorkerRole>('ইলেকট্রিশিয়ান');
  const [rate, setRate] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<WorkerRole>('ইলেকট্রিশিয়ান');
  const [editPhone, setEditPhone] = useState('');
  const [editRate, setEditRate] = useState('');
  const [updating, setUpdating] = useState(false);

  const roles: WorkerRole[] = ['ইলেকট্রিশিয়ান', 'ফোরম্যান', 'হেল্পার'];

  const handleStartEdit = (w: Worker) => {
    setEditingWorker(w);
    setEditName(w.name);
    setEditRole(w.role);
    setEditPhone(w.phone || '');
    const currentRate = finances[w.id]?.rate || 0;
    setEditRate(String(currentRate));
  };

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker || !editName.trim()) return;
    setUpdating(true);
    try {
      // 1. Update worker personal details
      await updateDoc(doc(db, 'workers', editingWorker.id), {
        name: editName.trim(),
        role: editRole,
        phone: editPhone.trim(),
      });

      // 2. Update worker daily rate in workerFinance
      await setDoc(
        doc(db, 'workerFinance', editingWorker.id),
        {
          rate: Number(editRate) || 0,
        },
        { merge: true }
      );

      setEditingWorker(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `workers/${editingWorker.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      // 1. Add worker
      const workerRef = await addDoc(collection(db, 'workers'), {
        name: name.trim(),
        role,
        phone: phone.trim(),
        createdAt: new Date().toISOString(),
      });

      // 2. Set worker finance
      await setDoc(doc(db, 'workerFinance', workerRef.id), {
        rate: Number(rate) || 0,
        prevDue: 0,
        advance: 0,
        paid: 0,
        manualDays: null,
        manualPayable: null,
      });

      setName('');
      setPhone('');
      setRate('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'workers');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (workerId: string) => {
    if (!window.confirm('আপনি কি সত্যিই এই কর্মীকে মুছে ফেলতে চান? এতে হাজিরার হিসাবও প্রভাব ফেলতে পারে।')) return;
    try {
      await deleteDoc(doc(db, 'workers', workerId));
      await deleteDoc(doc(db, 'workerFinance', workerId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workers/${workerId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Worker Form */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3 text-lg font-bold text-[var(--amber)]">
          <UserPlus className="w-5 h-5" />
          <h2>নতুন কর্মী যোগ করুন</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">কর্মীর নাম</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                placeholder="যেমন: রহিম মিয়া"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">পদবী / পদ</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as WorkerRole)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">দৈনিক হাজিরা মজুরি (৳)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="number"
                min="0"
                required
                placeholder="যেমন: ৮০০"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">মোবাইল নম্বর</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="tel"
                placeholder="01712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 font-bold hover:brightness-110 transition shadow-lg disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>কর্মী যুক্ত করুন</span>
            </button>
          </div>
        </form>
      </div>

      {/* Worker List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-bold text-sm text-[var(--text-main)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--amber)]" />
            <span>কর্মীদের তালিকা ({workers.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold">
              <tr>
                <th className="p-3.5">কর্মীর নাম</th>
                <th className="p-3.5">পদবী</th>
                <th className="p-3.5">দৈনিক মজুরি (৳)</th>
                <th className="p-3.5">মোবাইল নম্বর</th>
                <th className="p-3.5 text-center">হোয়াটসঅ্যাপ</th>
                <th className="p-3.5 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    কোনো কর্মী যুক্ত করা হয়নি।
                  </td>
                </tr>
              ) : (
                workers.map((w) => {
                  const fin = finances[w.id];
                  const dailyRate = fin ? fin.rate : 0;

                  return (
                    <tr key={w.id} className="hover:bg-zinc-800/30 transition">
                      <td className="p-3.5 font-semibold text-[var(--text-main)]">
                        <div>{w.name}</div>
                        {w.phone && (
                          <div className="mt-1.5 sm:hidden">
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(w, dailyRate)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WhatsApp পাঠান</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {w.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-emerald-400">{formatMoney(dailyRate)}</td>
                      <td className="p-3.5 text-[var(--text-muted)]">{w.phone || '-'}</td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(w, dailyRate)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition flex items-center justify-center gap-1 mx-auto font-bold text-xs cursor-pointer"
                          title="হোয়াটসঅ্যাপে পাঠান"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>পাঠান</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(w)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition text-xs font-bold cursor-pointer"
                            title="সম্পাদনা / ইডিট করুন"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>ইডিট</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(w.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition text-xs font-bold cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>মুছুন</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Worker Modal */}
      {editingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--amber)] flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                <span>কর্মীর তথ্য সম্পাদনা (Edit Worker)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingWorker(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateWorker} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">কর্মীর পুরো নাম *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">পদবী</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as WorkerRole)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">দৈনিক মজুরি (৳) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{updating ? 'আপডেট হচ্ছে...' : 'আপডেট সেভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
