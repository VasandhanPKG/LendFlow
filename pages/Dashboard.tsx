import React, { useState, useEffect } from 'react';
import { Customer, Payment, Loan } from '../types';
import { Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import { db } from '../firebase';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';

const Dashboard: React.FC = () => {
  const { t, settings, user } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Helper to map Firestore docs to plain objects immediately to avoid circular structure errors
  const mapDocs = (snap: QuerySnapshot<DocumentData>) => snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to isolated user collections
    const customersRef = collection(db, 'users', user.uid, 'customers');
    const paymentsRef = collection(db, 'users', user.uid, 'payments');
    const loansRef = collection(db, 'users', user.uid, 'loans');

    const unsubC = onSnapshot(customersRef, (snap) => {
      setCustomers(mapDocs(snap) as Customer[]);
    });
    
    const unsubP = onSnapshot(paymentsRef, (snap) => {
      setPayments(mapDocs(snap) as Payment[]);
    });

    const unsubL = onSnapshot(loansRef, (snap) => {
      setLoans(mapDocs(snap) as Loan[]);
    });

    return () => { unsubC(); unsubP(); unsubL(); };
  }, [user]);

  const activeLoans = loans.filter(l => l.status === 'Active' && l.principal > 0);
  const totalPrincipal = activeLoans.reduce((sum, l) => sum + l.principal, 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const today = new Date().getDate();

  const monthlyIncome = payments
    .filter(p => p.month === currentMonth && p.year === currentYear)
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const loansDueToday = activeLoans.filter(l => l.dueDate === today);
  const overdueLoans = activeLoans.filter(l => {
    const payment = payments.find(p => p.loanId === l.id && p.month === currentMonth && p.year === currentYear);
    return today > l.dueDate && (!payment || payment.status !== 'Paid');
  });

  const isDark = settings.themeMode === 'dark';

  // Helper to get customer name for a loan
  const getCustomerName = (customerId: string) => {
    return customers.find(c => c.id === customerId)?.name || 'Unknown';
  };

  const getCustomerPhone = (customerId: string) => {
    return customers.find(c => c.id === customerId)?.phone || '';
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in pb-12">
      <header className="px-1 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className={`text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {t('overview')}
          </h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-black text-xs md:text-sm uppercase tracking-[0.3em] mt-3 opacity-70`}>
            {t('portfolioSummary')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`hidden md:flex items-center gap-4 px-6 py-3 rounded-3xl border backdrop-blur-md ${isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white/40 border-slate-100 text-slate-500'}`}>
            <i className="fas fa-calendar-alt text-violet-500"></i>
            <span className="text-xs font-black uppercase tracking-widest">
              {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric', day: 'numeric' })}
            </span>
          </div>
          <Link 
            to="/transactions"
            className={`flex items-center gap-3 px-6 py-3 rounded-3xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-violet-900/20 border-violet-800 text-violet-400 hover:bg-violet-900/40' : 'bg-violet-50 border-violet-100 text-violet-600 hover:bg-violet-100'}`}
          >
            <i className="fas fa-receipt text-xs"></i>
            <span className="text-xs font-black uppercase tracking-widest">{t('transactions')}</span>
          </Link>
        </div>
      </header>

      {/* Responsive Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <StatCard 
          isDark={isDark} 
          label={t('active')} 
          value={customers.length.toString()} 
          icon="fa-users" 
          gradient="from-violet-600 to-indigo-600" 
          delay="delay-1" 
        />
        <StatCard 
          isDark={isDark} 
          label={t('capital')} 
          value={`₹${totalPrincipal.toLocaleString()}`} 
          icon="fa-money-bill-wave" 
          gradient={isDark ? 'from-slate-800 to-slate-900' : 'from-slate-800 to-slate-950'} 
          delay="delay-2" 
        />
        <StatCard 
          isDark={isDark} 
          label={t('income')} 
          value={`₹${monthlyIncome.toLocaleString()}`} 
          icon="fa-hand-holding-dollar" 
          gradient="from-emerald-500 to-teal-600" 
          delay="delay-3" 
        />
        <StatCard 
          isDark={isDark} 
          label={t('action')} 
          value={overdueLoans.length.toString()} 
          icon="fa-clock" 
          gradient="from-rose-500 to-orange-600" 
          delay="delay-1" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        <section className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20 animate-in delay-2 flex flex-col min-h-[500px]`}>
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <h3 className={`text-xl md:text-2xl font-black flex items-center gap-4 uppercase tracking-tighter ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <span className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${isDark ? 'bg-violet-900/40 text-violet-400' : 'bg-violet-100 text-violet-600'} flex items-center justify-center shadow-inner transform -rotate-6`}>
                <i className="fas fa-calendar-day text-lg md:text-xl"></i>
              </span>
              {t('dueToday')}
            </h3>
            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-violet-900/20 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
              {loansDueToday.length} Pending
            </span>
          </div>
          
          <div className="space-y-5 flex-1 overflow-y-auto scrollbar-hide">
            {loansDueToday.length > 0 ? (
              loansDueToday.map(l => (
                <div key={l.id} className={`group flex justify-between items-center p-5 md:p-7 rounded-[2rem] border transition-all hover:shadow-xl hover:shadow-violet-500/5 ${isDark ? 'bg-slate-800/40 border-slate-700 hover:border-violet-900/30' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-violet-100'}`}>
                  <div className="min-w-0 flex-1 pr-6">
                    <p className={`font-black text-base md:text-lg truncate group-hover:text-violet-600 transition-colors ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{getCustomerName(l.customerId)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{getCustomerPhone(l.customerId)}</p>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <p className="text-[10px] md:text-xs font-black text-violet-500 uppercase tracking-widest">Loan #{l.id.slice(-4)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <a 
                      href={`tel:${getCustomerPhone(l.customerId)}`}
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg shrink-0 ${isDark ? 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-emerald-100'}`}
                    >
                      <i className="fas fa-phone text-sm md:text-base"></i>
                    </a>
                    <div className="text-right shrink-0">
                      <p className="font-black text-violet-600 text-lg md:text-xl leading-none mb-1">₹{(l.principal * l.interestRate / 100).toLocaleString()}</p>
                      <Link to={`/customers/${l.customerId}`} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-violet-600 transition-colors">{t('details')}</Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 grayscale">
                <i className="fas fa-check-circle text-7xl mb-6 text-emerald-500"></i>
                <p className="text-center text-slate-500 uppercase tracking-[0.3em] text-[10px] font-black">Nothing due today</p>
              </div>
            )}
          </div>
        </section>

        <section className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20 animate-in delay-3 flex flex-col min-h-[500px]`}>
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <h3 className={`text-xl md:text-2xl font-black flex items-center gap-4 uppercase tracking-tighter ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <span className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${isDark ? 'bg-rose-900/40 text-rose-400' : 'bg-rose-100 text-rose-600'} flex items-center justify-center shadow-inner transform rotate-6`}>
                <i className="fas fa-exclamation-triangle text-lg md:text-xl"></i>
              </span>
              {t('overdue')}
            </h3>
            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-rose-900/20 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
              {overdueLoans.length} Critical
            </span>
          </div>

          <div className="space-y-5 flex-1 overflow-y-auto scrollbar-hide">
            {overdueLoans.length > 0 ? (
              overdueLoans.map(l => (
                <div key={l.id} className={`group flex justify-between items-center p-5 md:p-7 rounded-[2rem] border transition-all hover:shadow-xl hover:shadow-rose-500/5 ${isDark ? 'bg-rose-900/10 border-rose-900/20 hover:border-rose-500/40' : 'bg-rose-50/30 border-rose-100 hover:bg-white hover:border-rose-200'}`}>
                  <div className="min-w-0 flex-1 pr-6">
                    <p className={`font-black text-base md:text-lg truncate group-hover:text-rose-600 transition-colors ${isDark ? 'text-rose-100' : 'text-rose-900'}`}>{getCustomerName(l.customerId)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${isDark ? 'text-rose-400/60' : 'text-rose-400'}`}>{t('due')}: {l.dueDate}th</p>
                      <span className="w-1 h-1 rounded-full bg-rose-200"></span>
                      <p className="text-[10px] md:text-xs font-black text-rose-500 uppercase tracking-widest">Overdue</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <a 
                      href={`tel:${getCustomerPhone(l.customerId)}`}
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg shrink-0 ${isDark ? 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-emerald-100'}`}
                    >
                      <i className="fas fa-phone text-sm md:text-base"></i>
                    </a>
                    <div className="text-right shrink-0">
                      <p className={`font-black text-lg md:text-xl leading-none mb-1 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>₹{(l.principal * l.interestRate / 100).toLocaleString()}</p>
                      <Link to={`/customers/${l.customerId}`} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:underline">{t('collect')}</Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 grayscale">
                <i className="fas fa-smile-beam text-7xl mb-6 text-emerald-500"></i>
                <p className="text-center text-slate-500 uppercase tracking-[0.3em] text-[10px] font-black">All collections current</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: string; gradient: string; delay?: string; isDark: boolean }> = ({ label, value, icon, gradient, delay, isDark }) => (
  <div className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border shadow-2xl shadow-slate-200/20 flex flex-col items-center justify-center gap-6 animate-in ${delay} hover:shadow-3xl transition-all group active:scale-95 cursor-default overflow-hidden relative`}>
    <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${gradient} opacity-5 blur-2xl rounded-full group-hover:opacity-10 transition-opacity`}></div>
    <div className={`bg-gradient-to-br ${gradient} w-16 h-16 md:w-24 md:h-24 rounded-[2rem] flex items-center justify-center text-white text-2xl md:text-4xl shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-6`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="text-center min-w-0 w-full z-10">
      <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-2 truncate opacity-70">{label}</p>
      <p className={`text-lg md:text-3xl font-black leading-tight truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
    </div>
  </div>
);

export default Dashboard;