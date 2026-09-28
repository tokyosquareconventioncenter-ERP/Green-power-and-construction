import React, { useState } from 'react';
import { Site, IncomeRecord } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatMoney } from '../utils/formatters';
import { MapPin, Plus, Trash2, Building2, Pencil, X, Check } from 'lucide-react';

interface SitesProps {
  sites: Site[];
  income: IncomeRecord[];
}

export const Sites: React.FC<SitesProps> = ({ sites, income }) => {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editName, setEditName] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleStartEdit = (s: Site) => {
    setEditingSite(s);
    setEditName(s.name);
  };

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite || !editName.trim()) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'sites', editingSite.id), {
        name: editName.trim(),
      });
      setEditingSite(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sites/${editingSite.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'sites'), {
        name: name.trim(),
        createdAt: new Date().toISOString(),
      });
      setName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sites');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি সত্যিই এই সাইটটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'sites', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sites/${id}`);
    }
  };

  // Calculate total income per site
  const siteIncomeMap = income.reduce((acc, curr) => {
    acc[curr.siteId] = (acc[curr.siteId] || 0) + (curr.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Add Site Form */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3 text-lg font-bold text-[var(--amber)]">
          <Building2 className="w-5 h-5" />
          <h2>নতুন সাইট যোগ করুন</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">সাইটের নাম</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                placeholder="যেমন: ধানমন্ডি প্রজেক্ট ৩/এ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 font-bold hover:brightness-110 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>সাইট যুক্ত করুন</span>
          </button>
        </form>
      </div>

      {/* Sites List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--copper)]" />
          <span>সাইটের তালিকা ({sites.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold">
              <tr>
                <th className="p-3.5">সাইটের নাম</th>
                <th className="p-3.5">মোট আয় (৳)</th>
                <th className="p-3.5 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
              {sites.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-[var(--text-muted)]">
                    কোনো সাইট যুক্ত করা হয়নি।
                  </td>
                </tr>
              ) : (
                sites.map((s) => {
                  const totalInc = siteIncomeMap[s.id] || 0;
                  return (
                    <tr key={s.id} className="hover:bg-zinc-800/30 transition">
                      <td className="p-3.5 font-semibold text-[var(--amber)]">{s.name}</td>
                      <td className="p-3.5 font-bold text-emerald-400">{formatMoney(totalInc)}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition text-xs font-bold cursor-pointer"
                            title="সাইটের নাম সম্পাদনা / ইডিট"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>ইডিট</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
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

      {/* Edit Site Modal */}
      {editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--amber)] flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                <span>সাইট সম্পাদনা (Edit Site Name)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSite} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">সাইটের সঠিক নাম *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
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
