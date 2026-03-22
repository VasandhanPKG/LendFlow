
import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Payment, PrincipalLog, Customer } from '../types';

const Transactions: React.FC = () => {
  const { t, settings, user } = useApp();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [principalLogs, setPrincipalLogs] = useState<PrincipalLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const isDark = settings.themeMode === 'dark';

  // Helper to map Firestore docs to plain objects immediately to avoid circular structure errors
  const mapDocs = (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => 
    snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const sanitizeData = (data: Record<string, unknown>): Record<string, unknown> => {
    const sanitized = { ...data };
    for (const key in sanitized) {
      const value = sanitized[key];
      if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
        sanitized[key] = (value as { toMillis: () => number }).toMillis();
      }
    }
    return sanitized;
  };

  useEffect(() => {
    if (!user) return;

    const customersRef = collection(db, 'users', user.uid, 'customers');
    const unsubC = onSnapshot(customersRef, (snap) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCustomers(mapDocs(snap as any).map((d) => sanitizeData(d as Record<string, unknown>)) as Customer[]);
    });

    return () => unsubC();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch payments for the selected month/year
    const paymentsRef = query(
      collection(db, 'users', user.uid, 'payments'),
      where('month', '==', selectedMonth),
      where('year', '==', selectedYear)
    );

    const unsubP = onSnapshot(paymentsRef, (snap) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPayments(mapDocs(snap as any).map((d) => sanitizeData(d as Record<string, unknown>)) as Payment[]);
    });

    // Fetch principal logs for the selected month/year
    const startOfMonth = new Date(selectedYear, selectedMonth, 1).getTime();
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

    const logsRef = query(
      collection(db, 'users', user.uid, 'principalLogs'),
      where('timestamp', '>=', startOfMonth),
      where('timestamp', '<=', endOfMonth)
    );

    const unsubL = onSnapshot(logsRef, (snap) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPrincipalLogs(mapDocs(snap as any).map((d) => sanitizeData(d as Record<string, unknown>)) as PrincipalLog[]);
    });

    return () => {
      unsubP();
      unsubL();
    };
  }, [user, selectedMonth, selectedYear]);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  // Combine and sort transactions
  const allTransactions = [
    ...payments.map(p => ({
      id: p.id,
      type: 'payment' as const,
      amount: p.amountPaid,
      date: p.timestamp,
      customerId: p.customerId,
      status: p.status,
      details: `${new Date(0, p.month).toLocaleString('default', { month: 'short' })} ${p.year}`
    })),
    ...principalLogs.map(l => ({
      id: l.id,
      type: 'principal' as const,
      amount: l.amountChange,
      date: l.timestamp,
      customerId: l.customerId,
      status: l.amountChange > 0 ? 'Lend' : 'Recover',
      details: l.reason
    }))
  ].sort((a, b) => b.date - a.date);

  const totalPayments = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalLent = principalLogs.filter(l => l.amountChange > 0).reduce((sum, l) => sum + l.amountChange, 0);
  const totalRecovered = principalLogs.filter(l => l.amountChange < 0).reduce((sum, l) => sum + Math.abs(l.amountChange), 0);

  return (
    <div className="space-y-8 md:space-y-12 animate-in pb-12">
      <header className="px-1 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className={`text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {t('transactions')}
          </h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-black text-xs md:text-sm uppercase tracking-[0.3em] mt-3 opacity-70`}>
            {t('monthlyLedger')}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <select 
            className={`px-6 py-3 rounded-2xl border font-black uppercase tracking-widest text-xs outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-600'}`}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            className={`px-6 py-3 rounded-2xl border font-black uppercase tracking-widest text-xs outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-600'}`}
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-8 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{t('payment')}</p>
          <p className={`text-3xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{totalPayments.toLocaleString()}</p>
        </div>
        <div className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-8 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{t('lend')}</p>
          <p className={`text-3xl font-black ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>₹{totalLent.toLocaleString()}</p>
        </div>
        <div className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-8 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{t('recover')}</p>
          <p className={`text-3xl font-black ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>₹{totalRecovered.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions List */}
      <section className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-6 md:p-10 rounded-[3rem] border shadow-2xl shadow-slate-200/20 animate-in`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('date')}</th>
                <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('customer')}</th>
                <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('type')}</th>
                <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">{t('amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {allTransactions.length > 0 ? (
                allTransactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-6">
                      <p className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="py-6">
                      <p className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {getCustomerName(tx.customerId)}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        {tx.details}
                      </p>
                    </td>
                    <td className="py-6">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        tx.type === 'payment' 
                          ? (isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                          : (tx.amount > 0 
                              ? (isDark ? 'bg-rose-900/20 text-rose-400' : 'bg-rose-50 text-rose-600')
                              : (isDark ? 'bg-violet-900/20 text-violet-400' : 'bg-violet-50 text-violet-600'))
                      }`}>
                        {tx.type === 'payment' ? t('payment') : (tx.amount > 0 ? t('lend') : t('recover'))}
                      </span>
                    </td>
                    <td className="py-6 text-right">
                      <p className={`text-lg font-black ${
                        tx.type === 'payment' 
                          ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                          : (tx.amount > 0 
                              ? (isDark ? 'text-rose-400' : 'text-rose-600')
                              : (isDark ? 'text-violet-400' : 'text-violet-600'))
                      }`}>
                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-20 text-center opacity-30 grayscale">
                    <i className="fas fa-receipt text-6xl mb-6"></i>
                    <p className="text-xs font-black uppercase tracking-[0.3em]">{t('noRecordsFound')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Transactions;
