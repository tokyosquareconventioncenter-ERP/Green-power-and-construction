import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db, createSecondaryAuth, handleFirestoreError, OperationType } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserPlus, Mail, Lock, User, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface UsersProps {
  users: UserProfile[];
}

export const Users: React.FC<UsersProps> = ({ users }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'foreman' | 'owner'>('foreman');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    if (password.length < 6) {
      setErrorMsg('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Use secondary auth instance so current owner session is preserved
      const secondaryAuth = createSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password.trim());

      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(),
        email: email.trim(),
        role: role,
      });

      setSuccessMsg(`ব্যবহারকারী '${name.trim()}' (${role === 'owner' ? 'মালিক' : 'ফরম্যান'}) সফলভাবে তৈরি করা হয়েছে!`);
      setName('');
      setEmail('');
      setPassword('');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('এই ইমেইলটি ইতিপূর্বে ব্যবহার করা হয়েছে');
      } else {
        setErrorMsg(`একাউন্ট তৈরিতে সমস্যা: ${err.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create User Form */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3 text-lg font-bold text-[var(--amber)]">
          <UserPlus className="w-5 h-5" />
          <h2>নতুন ফরম্যান / ব্যবহারকারী তৈরি করুন</h2>
        </div>

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">নাম</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                placeholder="যেমন: জামাল ফরম্যান"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">ইমেইল অ্যাড্রেস</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="email"
                required
                placeholder="foreman@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">পাসওয়ার্ড (নূন্যতম ৬ অক্ষর)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">রোল / অনুমতি</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'foreman' | 'owner')}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--amber)]"
              >
                <option value="foreman">🛠 ফরম্যান (শুধুমাত্র তথ্য যোগ)</option>
                <option value="owner">👑 মালিক (পূর্ণ নিয়ন্ত্রণ)</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 font-bold hover:brightness-110 transition shadow-lg disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>একাউন্ট তৈরি করুন</span>
            </button>
          </div>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-bold text-sm text-[var(--text-main)]">
          ব্যবহারকারীদের তালিকা ({users.length})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold">
              <tr>
                <th className="p-3.5">নাম</th>
                <th className="p-3.5">ইমেইল</th>
                <th className="p-3.5">রোল</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-zinc-800/30 transition">
                  <td className="p-3.5 font-semibold text-[var(--text-main)]">{u.name}</td>
                  <td className="p-3.5 text-[var(--text-muted)]">{u.email || '-'}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'owner'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {u.role === 'owner' ? '👑 মালিক' : '🛠 ফরম্যান'}
                    </span>
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
