import React from 'react';
import { useOnlineStatus } from '../utils/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="no-print fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/90 text-white px-4 py-2.5 text-sm font-medium shadow-2xl backdrop-blur-md border border-amber-400/30 animate-bounce">
      <WifiOff className="w-5 h-5 shrink-0 text-amber-200" />
      <span>অফলাইন — নেট এলে তথ্য স্বয়ংক্রিয়ভাবে সিঙ্ক হবে</span>
    </div>
  );
};
