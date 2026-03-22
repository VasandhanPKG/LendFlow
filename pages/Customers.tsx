
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Customer, Loan } from '../types';
import { useApp } from '../AppContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

type SortKey = 'name' | 'totalPrincipal' | 'loanCount';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  order: SortOrder;
}

interface CustomerWithStats extends Customer {
  totalPrincipal: number;
  loanCount: number;
}

const Customers: React.FC = () => {
  const { t, settings, user } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrincipal, setMinPrincipal] = useState<string>('');
  const [maxPrincipal, setMaxPrincipal] = useState<string>('');
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', order: 'asc' });

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
    const cRef = collection(db, 'users', user.uid, 'customers');
    const lRef = collection(db, 'users', user.uid, 'loans');
    
    const unsubC = onSnapshot(cRef, (snap) => {
      const data = snap.docs.map(doc => {
        const raw = doc.data();
        return { id: doc.id, ...sanitizeData(raw) } as Customer;
      });
      setCustomers(data);
    });

    const unsubL = onSnapshot(lRef, (snap) => {
      const data = snap.docs.map(doc => {
        const raw = doc.data();
        return { id: doc.id, ...sanitizeData(raw) } as Loan;
      });
      setLoans(data);
    });

    return () => { unsubC(); unsubL(); };
  }, [user]);

  const customersWithStats = useMemo(() => {
    return customers.map(c => {
      const customerLoans = loans.filter(l => l.customerId === c.id && l.status === 'Active');
      const totalPrincipal = customerLoans.reduce((sum, l) => sum + l.principal, 0);
      return {
        ...c,
        totalPrincipal,
        loanCount: customerLoans.length
      } as CustomerWithStats;
    });
  }, [customers, loans]);

  const clearFilters = () => {
    setSearchTerm('');
    setMinPrincipal('');
    setMaxPrincipal('');
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const processedCustomers = useMemo(() => {
    const result = customersWithStats.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.phone.includes(searchTerm);
      const min = minPrincipal === '' ? 0 : parseFloat(minPrincipal);
      const max = maxPrincipal === '' ? Infinity : parseFloat(maxPrincipal);
      return matchesSearch && c.totalPrincipal >= min && c.totalPrincipal <= max;
    });

    result.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [customersWithStats, searchTerm, minPrincipal, maxPrincipal, sortConfig]);

  const isDark = settings.themeMode === 'dark';

  const renderSortIcon = (column: SortKey) => {
    if (sortConfig.key !== column) return <i className="fas fa-sort ml-2 opacity-20 text-[8px]"></i>;
    return sortConfig.order === 'asc' 
      ? <i className="fas fa-sort-up ml-2 text-violet-500"></i> 
      : <i className="fas fa-sort-down ml-2 text-violet-500"></i>;
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in pb-12">
      <header className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className={`text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {t('customers')}
          </h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-black text-xs md:text-sm uppercase tracking-[0.3em] mt-3 opacity-70`}>
            {t('manageBorrowers')}
          </p>
        </div>
        <Link 
          to="/customers/new" 
          className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-xl shadow-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group"
        >
          <i className="fas fa-user-plus group-hover:rotate-12 transition-transform"></i>
          {t('addBorrower')}
        </Link>
      </header>

      {/* Search & Filter Bar */}
      <div className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20 space-y-4`}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <i className={`fas fa-search absolute left-6 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-violet-500 transition-colors`}></i>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className={`w-full pl-14 pr-6 py-4 rounded-2xl border-2 outline-none transition-all font-bold ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-violet-500/50 focus:bg-slate-800' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-violet-500/30 focus:bg-white'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border-2 transition-all flex items-center justify-center gap-3 ${showFilters ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20' : isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white'}`}
          >
            <i className={`fas ${showFilters ? 'fa-times' : 'fa-filter'}`}></i>
            {showFilters ? t('close') : t('filter')}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100/10 animate-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('minPrincipal')}</label>
              <input
                type="number"
                placeholder="₹ 0"
                className={`w-full px-6 py-3 rounded-xl border-2 outline-none transition-all font-bold ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-violet-500/50' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-violet-500/30'}`}
                value={minPrincipal}
                onChange={(e) => setMinPrincipal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('maxPrincipal')}</label>
              <input
                type="number"
                placeholder="₹ 0"
                className={`w-full px-6 py-3 rounded-xl border-2 outline-none transition-all font-bold ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-violet-500/50' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-violet-500/30'}`}
                value={maxPrincipal}
                onChange={(e) => setMaxPrincipal(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={clearFilters}
                className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${isDark ? 'bg-rose-900/20 text-rose-400 hover:bg-rose-900/40' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
              >
                {t('resetFilters')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Display */}
      <div className="space-y-4">
        {processedCustomers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {/* Desktop Header */}
            <div className={`hidden lg:grid grid-cols-12 gap-4 px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <div className="col-span-4 cursor-pointer hover:text-violet-500" onClick={() => handleSort('name')}>{t('borrower')} {renderSortIcon('name')}</div>
              <div className="col-span-2 text-center cursor-pointer hover:text-violet-500" onClick={() => handleSort('totalPrincipal')}>{t('capital')} {renderSortIcon('totalPrincipal')}</div>
              <div className="col-span-2 text-center cursor-pointer hover:text-violet-500" onClick={() => handleSort('loanCount')}>{t('activeLoans')} {renderSortIcon('loanCount')}</div>
              <div className="col-span-3 text-center">{t('autoDueDay')}</div>
              <div className="col-span-1 text-right">{t('action')}</div>
            </div>

            {/* Customer List */}
            {processedCustomers.map((c, idx) => {
              const customerLoans = loans.filter(l => l.customerId === c.id && l.status === 'Active');
              const dueDate = customerLoans.length > 0 ? customerLoans[0].dueDate : '-';
              
              return (
                <div 
                  key={c.id} 
                  className={`group grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-6 md:p-8 rounded-[2.5rem] border transition-all hover:shadow-2xl hover:shadow-violet-500/5 animate-in delay-${(idx % 5) + 1} ${isDark ? 'bg-slate-900/40 border-slate-800 hover:border-violet-900/30' : 'bg-white border-slate-100 hover:border-violet-100'}`}
                >
                  {/* Identity */}
                  <div className="col-span-1 lg:col-span-4 flex items-center gap-5">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black shadow-inner transform group-hover:rotate-6 transition-transform ${isDark ? 'bg-slate-800 text-violet-400' : 'bg-slate-100 text-violet-600'}`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-black text-lg md:text-xl truncate group-hover:text-violet-600 transition-colors ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                        {c.name}
                      </h4>
                      <p className={`text-[10px] md:text-xs font-black uppercase tracking-widest mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <i className="fas fa-phone mr-2 text-violet-500/50"></i>
                        {c.phone}
                      </p>
                      <p className={`text-[10px] md:text-xs font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                        <i className="fas fa-user-tag mr-2 text-violet-500/30"></i>
                        {c.referrer || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="col-span-1 lg:col-span-2 text-center py-4 lg:py-0 border-y lg:border-y-0 border-slate-100/10">
                    <p className={`text-xl md:text-2xl font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      ₹{c.totalPrincipal.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{t('totalCapital')}</p>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 lg:col-span-2 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isDark ? 'bg-violet-900/20 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{c.loanCount} {t('loans')}</span>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="col-span-1 lg:col-span-3 text-center">
                    <p className={`text-xl md:text-2xl font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {dueDate}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{t('autoDueDay')}</p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 lg:col-span-1 flex justify-end gap-3">
                    <Link 
                      to={`/customers/${c.id}`}
                      className={`w-full lg:w-14 lg:h-14 py-4 lg:py-0 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all flex items-center justify-center gap-3 ${isDark ? 'bg-slate-800 text-slate-100 hover:bg-violet-600' : 'bg-slate-900 text-white hover:bg-violet-600 shadow-xl shadow-slate-900/10'}`}
                    >
                      <i className="fas fa-eye lg:text-lg"></i>
                      <span className="lg:hidden">{t('viewProfile')}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 opacity-30 grayscale animate-in">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <i className="fas fa-ghost text-4xl text-slate-400"></i>
            </div>
            <p className="text-center text-slate-500 uppercase tracking-[0.4em] text-xs font-black">
              {t('noRecordsFound')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
