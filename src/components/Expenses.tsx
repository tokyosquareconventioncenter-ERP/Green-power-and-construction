import React, { useState } from 'react';
import { Site, ExpenseRecord, ExpenseCategory, UserRole } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatBengaliDate, formatMoney } from '../utils/formatters';
import { Receipt, Plus, Trash2, Calendar, MapPin, DollarSign, Tag, FileText, Pencil, X, Check } from 'lucide-react';

interface ExpensesProps {
  sites: Site[];
  expenses: ExpenseRecord[];
  role: UserRole;
  userName: string;
}

export const Expenses: React.FC<ExpensesProps> = ({ sites, expenses, role, userName }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [siteId, setSiteId] = useState(sites.length > 0 ? sites[0].id : '');
  const [category, setCategory] = useState<ExpenseCategory>('মালামাল');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSiteId, setEditSiteId] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('মালামাল');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const categories: ExpenseCategory[] = ['মালামাল', 'যাতায়াত', 'খাওয়া-দাওয়া', 'ভাড়া/মেশিন', 'অন্যান্য'];

  const handleStartEdit = (item: ExpenseRecord) => {
    setEditingExpense(item);
    setEditDate(item.date);
    setEditSiteId(item.siteId);
    setEditCategory(item.category);
    setEditAmount(String(item.amount));
    setEditNote(item.note || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editSiteId || !editAmount || Number(editAmount) <= 0) return;
    setUpdating(true);
    try {
      const targetSite = sites.find((s) => s.id === editSiteId);
      await updateDoc(doc(db, 'expenses', editingExpense.id), {
        date: editDate,
        siteId: editSiteId,
        siteName: targetSite ? targetSite.name : '',
        category: editCategory,
        amount: Number(editAmount),
        note: editNote.trim(),
      });
      setEditingExpense(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${editingExpense.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !amount || Number(amount) <= 0) return;

    setSubmitting(true);
    const targetSite = sites.find((s) => s.id === siteId);

    try {
      await addDoc(collection(db, 'expenses'), {
        date,
        siteId,
        siteName: targetSite ? targetSite.name : '',
        category,
        amount: Number(amount),
        note: note.trim(),
        createdBy: userName,
        createdAt: new Date().toISOString(),
      });

      setAmount('');
      setNote('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'expenses');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (role !== 'owner') return;
    if (!window.confirm('আপনি কি সত্যিই এই খরচের তথ্য মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Expense Entry Form */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3 text-lg font-bold text-[var(--copper)]">
          <Receipt className="w-5 h-5" />
          <h2>দৈনিক সাইট খরচ যোগ করুন (মজুরি ছাড়া)</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">তারিখ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">সাইট</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <select
                required
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              >
                <option value="">সাইট সিলেক্ট করুন</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">খরচের ক্যাটাগরি</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">টাকার পরিমাণ (৳)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="number"
                min="1"
                required
                placeholder="যেমন: ৩,৫০০"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">নোট / বিবরণ</label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="যেমন: পাইপ ও টেপ ক্রয়"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-5 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 font-bold hover:brightness-110 transition shadow-lg disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>খরচ জমা দিন</span>
            </button>
          </div>
        </form>
      </div>

      {/* Expense Records List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-bold text-sm text-[var(--text-main)]">
          সর্বশেষ খরচের তালিকা ({expenses.length})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold">
              <tr>
                <th className="p-3.5">তারিখ</th>
                <th className="p-3.5">সাইট</th>
                <th className="p-3.5">ক্যাটাগরি</th>
                <th className="p-3.5">টাকা (৳)</th>
                <th className="p-3.5">বিবরণ / নোট</th>
                {role === 'owner' && <th className="p-3.5 text-center">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    কোনো খরচের রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition">
                    <td className="p-3.5 font-medium whitespace-nowrap">
                      {formatBengaliDate(item.date)}
                    </td>
                    <td className="p-3.5 font-semibold text-[var(--amber)]">{item.siteName}</td>
                    <td className="p-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-red-400">{formatMoney(item.amount)}</td>
                    <td className="p-3.5 text-[var(--text-muted)]">{item.note || '-'}</td>
                    {role === 'owner' && (
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition text-xs font-bold cursor-pointer"
                            title="সম্পাদনা / ইডিট করুন"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>ইডিট</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
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

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--amber)] flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                <span>খরচের তথ্য সম্পাদনা (Edit Expense)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">তারিখ</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">সাইট নির্বাচন</label>
                <select
                  required
                  value={editSiteId}
                  onChange={(e) => setEditSiteId(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="">সাইট সিলেক্ট করুন</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">ক্যাটাগরি</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">খরচের পরিমাণ (৳)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-red-400 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">বিবরণ / নোট</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="যেমন: ৩ রোল তার ও পাইপ ক্রয়"
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
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
