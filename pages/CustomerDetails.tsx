import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Customer, Payment, PrincipalLog, Loan } from '../types';
import { useApp } from '../AppContext';
import { db } from '../firebase';
import { doc, collection, addDoc, onSnapshot, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import ConfirmationModal from '../components/ConfirmationModal';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, settings, user } = useApp();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [principalLogs, setPrincipalLogs] = useState<PrincipalLog[]>([]);
  
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPrincipalModal, setShowPrincipalModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdjustmentConfirm, setShowAdjustmentConfirm] = useState(false);
  
  const [newLoanData, setNewLoanData] = useState({
    principal: 0,
    interestRate: 5,
    dueDate: new Date().getDate(),
    startDate: new Date().toISOString().split('T')[0]
  });

  const [principalChange, setPrincipalChange] = useState({ 
    amount: 0, 
    reason: '', 
    type: 'increase',
    date: new Date().toISOString().split('T')[0]
  });

  const [paymentInput, setPaymentInput] = useState({ 
    amount: 0, 
    month: new Date().getMonth(), 
    year: new Date().getFullYear(),
    collectionDate: new Date().toISOString().split('T')[0]
  });

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
    if (!user || !id) return;

    const customerRef = doc(db, 'users', user.uid, 'customers', id);
    const loansRef = query(collection(db, 'users', user.uid, 'loans'), where('customerId', '==', id));
    const paymentsRef = query(collection(db, 'users', user.uid, 'payments'), where('customerId', '==', id));
    const logsRef = query(collection(db, 'users', user.uid, 'principalLogs'), where('customerId', '==', id));

    const unsubC = onSnapshot(customerRef, (snap) => {
      if (snap.exists()) {
        setCustomer({ id: snap.id, ...sanitizeData(snap.data() as Record<string, unknown>) } as Customer);
      } else {
        navigate('/customers');
      }
    });
    
    const unsubL = onSnapshot(loansRef, (snap) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loanList = mapDocs(snap as any).map((d) => sanitizeData(d as Record<string, unknown>)) as Loan[];
      setLoans(loanList);
      if (loanList.length > 0 && !selectedLoanId) {
        setSelectedLoanId(loanList[0].id);
      }
    });

    const unsubP = onSnapshot(paymentsRef, (snap) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPayments(mapDocs(snap as any).map((d) => sanitizeData(d as Record<string, unknown>)) as Payment[]);
    });
    
    const unsubLog = onSnapshot(logsRef, (snap) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPrincipalLogs(mapDocs(snap as any).map((d) => sanitizeData(d as Record<string, unknown>)) as PrincipalLog[]);
    });

    return () => { unsubC(); unsubL(); unsubP(); unsubLog(); };
  }, [user, id, navigate, selectedLoanId]);

  const selectedLoan = loans.find(l => l.id === selectedLoanId);

  const handleAddLoan = async () => {
    if (!user || !id) return;
    try {
      const loanData: Omit<Loan, 'id'> = {
        customerId: id,
        principal: newLoanData.principal,
        interestRate: newLoanData.interestRate,
        dueDate: newLoanData.dueDate,
        startDate: new Date(newLoanData.startDate).getTime(),
        createdAt: Date.now(),
        status: 'Active'
      };
      await addDoc(collection(db, 'users', user.uid, 'loans'), loanData);
      setShowLoanModal(false);
      setNewLoanData({ ...newLoanData, principal: 0 });
    } catch (e: unknown) {
      console.error(e instanceof Error ? e.message : e);
    }
  };

  const handleUpdatePrincipal = async () => {
    if (!selectedLoan || !user) return;
    
    if (principalChange.amount > 50000 && !showAdjustmentConfirm) {
      setShowAdjustmentConfirm(true);
      return;
    }

    const diff = principalChange.type === 'increase' ? principalChange.amount : -principalChange.amount;
    const newP = selectedLoan.principal + diff;
    const timestamp = new Date(principalChange.date).getTime();
    
    try {
      const batch = writeBatch(db);
      const loanRef = doc(db, 'users', user.uid, 'loans', selectedLoan.id);
      batch.update(loanRef, { principal: newP });

      const logRef = doc(collection(db, 'users', user.uid, 'principalLogs'));
      batch.set(logRef, { 
        customerId: id, 
        loanId: selectedLoan.id,
        amountChange: diff, 
        newPrincipal: newP, 
        reason: principalChange.reason || 'Manual Adjustment', 
        timestamp: timestamp 
      });

      await batch.commit();
      setShowPrincipalModal(false);
      setShowAdjustmentConfirm(false);
      setPrincipalChange({ ...principalChange, amount: 0, reason: '' });
    } catch (e: unknown) {
      console.error(e instanceof Error ? e.message : e);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer || !user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'customers', customer.id));
      navigate('/customers');
    } catch (e: unknown) {
      console.error(e instanceof Error ? e.message : e);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedLoan || !user) return;
    const totalDue = (selectedLoan.principal * selectedLoan.interestRate) / 100;
    const status = paymentInput.amount >= totalDue ? 'Paid' : (paymentInput.amount > 0 ? 'Partial' : 'Pending');
    const timestamp = new Date(paymentInput.collectionDate).getTime();

    const paymentData = { 
      customerId: id, 
      loanId: selectedLoan.id,
      month: paymentInput.month, 
      year: paymentInput.year, 
      amountPaid: paymentInput.amount, 
      totalDue: totalDue, 
      status: status, 
      timestamp: timestamp 
    };

    try {
      await addDoc(collection(db, 'users', user.uid, 'payments'), paymentData);
      setShowPaymentModal(false);
      setPaymentInput({ ...paymentInput, amount: 0 });
    } catch (e: unknown) {
      console.error(e instanceof Error ? e.message : e);
    }
  };

  const isDark = settings.themeMode === 'dark';

  if (!customer) return <div className="p-12 md:p-20 text-center font-bold text-slate-300 animate-pulse">Accessing Secure Records...</div>;

  const filteredPayments = payments.filter(p => p.loanId === selectedLoanId);
  const filteredLogs = principalLogs.filter(l => l.loanId === selectedLoanId);

  return (
    <div className="space-y-8 md:space-y-12 animate-in pb-12">
      {/* Premium Header */}
      <header className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 md:w-24 md:h-24 rounded-3xl flex items-center justify-center text-3xl md:text-5xl font-black shadow-2xl transform -rotate-3 ${isDark ? 'bg-slate-800 text-violet-400' : 'bg-white text-violet-600'}`}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className={`text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {customer.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <a href={`tel:${customer.phone}`} className={`text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-slate-400 hover:text-violet-400' : 'text-slate-500 hover:text-violet-600'}`}>
                <i className="fas fa-phone text-violet-500"></i>
                {customer.phone}
              </a>
              <span className="w-1 h-1 rounded-full bg-slate-300 hidden md:block"></span>
              <p className={`text-xs md:text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <i className="fas fa-user-tag mr-2 text-violet-500/50"></i>
                {t('referrer')}: {customer.referrer || '-'}
              </p>
              <span className="w-1 h-1 rounded-full bg-slate-300 hidden md:block"></span>
              <p className={`text-xs md:text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('joined')}: {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowLoanModal(true)}
            className="flex-1 md:flex-none bg-gradient-to-br from-violet-600 to-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-xl shadow-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group"
          >
            <i className="fas fa-plus group-hover:rotate-12 transition-transform"></i>
            {t('newLoan')}
          </button>
        </div>
      </header>

      {/* Loan Selection & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Loan Selector Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20`}>
            <h3 className={`text-xs font-black uppercase tracking-[0.3em] mb-6 opacity-50 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('activeLoans')}
            </h3>
            <div className="space-y-3">
              {loans.length > 0 ? (
                loans.map((l, idx) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLoanId(l.id)}
                    className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                      selectedLoanId === l.id 
                        ? 'bg-violet-600 border-violet-600 text-white shadow-xl shadow-violet-500/20' 
                        : isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-black text-sm uppercase tracking-widest">Loan #{idx + 1}</p>
                      <p className={`text-[10px] font-black uppercase opacity-60 mt-1 ${selectedLoanId === l.id ? 'text-white' : ''}`}>
                        ₹{l.principal.toLocaleString()} @ {l.interestRate}%
                      </p>
                    </div>
                    <i className={`fas fa-chevron-right text-xs transition-transform group-hover:translate-x-1 ${selectedLoanId === l.id ? 'text-white' : 'text-slate-400'}`}></i>
                  </button>
                ))
              ) : (
                <div className="py-12 text-center opacity-30">
                  <i className="fas fa-folder-open text-3xl mb-4"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">{t('noActiveLoans')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats for Selected Loan */}
          {selectedLoan && (
            <div className={`bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/40 animate-in`}>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-6">{t('loanSummary')}</p>
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{t('currentPrincipal')}</p>
                    <p className="text-3xl font-black leading-none">₹{selectedLoan.principal.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => setShowPrincipalModal(true)}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <i className="fas fa-edit text-xs"></i>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{t('interest')}</p>
                    <p className="text-lg font-black">₹{(selectedLoan.principal * selectedLoan.interestRate / 100).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{t('dueDay')}</p>
                    <p className="text-lg font-black">{selectedLoan.dueDate}th</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {selectedLoan ? (
            <>
              {/* Payments Ledger */}
              <section className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20 animate-in`}>
                <div className="flex items-center justify-between mb-10">
                  <h3 className={`text-xl md:text-2xl font-black flex items-center gap-4 uppercase tracking-tighter ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                    <span className={`w-12 h-12 rounded-2xl ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center shadow-inner`}>
                      <i className="fas fa-receipt text-lg"></i>
                    </span>
                    {t('payments')}
                  </h3>
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-plus"></i>
                    {t('addPayment')}
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.sort((a,b) => b.timestamp - a.timestamp).map((p, idx) => (
                      <div key={p.id} className={`flex items-center justify-between p-6 rounded-2xl border transition-all animate-in delay-${(idx % 5) + 1} ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50/50 border-slate-100 hover:bg-white'}`}>
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-slate-700 text-emerald-400' : 'bg-white text-emerald-600 shadow-sm'}`}>
                            <i className="fas fa-check"></i>
                          </div>
                          <div>
                            <p className={`font-black text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>₹{p.amountPaid.toLocaleString()}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                              {new Date(0, p.month).toLocaleString('default', { month: 'long' })} {p.year} • Rec'd: {new Date(p.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            p.status === 'Paid' ? (isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : 
                            p.status === 'Partial' ? (isDark ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-50 text-amber-600') : (isDark ? 'bg-rose-900/20 text-rose-400' : 'bg-rose-50 text-rose-600')
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center opacity-20 grayscale">
                      <i className="fas fa-receipt text-6xl mb-6"></i>
                      <p className="text-xs font-black uppercase tracking-[0.3em]">{t('noPaymentsYet')}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Audit Log */}
              <section className={`${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/80'} backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border shadow-2xl shadow-slate-200/20 animate-in delay-1`}>
                <h3 className={`text-xl md:text-2xl font-black mb-10 flex items-center gap-4 uppercase tracking-tighter ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  <span className={`w-12 h-12 rounded-2xl ${isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600'} flex items-center justify-center shadow-inner`}>
                    <i className="fas fa-history text-lg"></i>
                  </span>
                  {t('auditLog')}
                </h3>
                <div className="space-y-6">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.sort((a,b) => b.timestamp - a.timestamp).map((log, idx) => (
                      <div key={log.id} className="relative pl-10 group">
                        {idx !== filteredLogs.length - 1 && (
                          <div className={`absolute left-[1.45rem] top-8 bottom-0 w-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                        )}
                        <div className={`absolute left-4 top-1 w-3 h-3 rounded-full border-2 transition-colors ${isDark ? 'bg-slate-900 border-slate-700 group-hover:border-amber-500' : 'bg-white border-slate-200 group-hover:border-amber-500'} ${log.amountChange > 0 ? 'bg-violet-600' : 'bg-rose-500'}`}></div>
                        <div>
                          <p className={`text-xs font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                          <div className="flex justify-between items-start">
                            <p className={`text-sm md:text-base font-bold leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {log.reason}
                            </p>
                            <p className={`font-black text-sm ${log.amountChange > 0 ? 'text-violet-400' : 'text-rose-400'}`}>
                              {log.amountChange > 0 ? '+' : ''}₹{Math.abs(log.amountChange).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1">Final: ₹{log.newPrincipal.toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-10 text-slate-400 italic text-sm">No activity recorded yet.</p>
                  )}
                </div>
              </section>

              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${isDark ? 'bg-rose-900/10 text-rose-400 border-rose-900/30 hover:bg-rose-900/30' : 'bg-white text-rose-500 border-rose-50 hover:bg-rose-50'}`}
              >
                <i className="fas fa-trash-alt text-[10px]"></i>
                {t('deleteBtn')}
              </button>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-32 opacity-30 grayscale animate-in">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <i className="fas fa-hand-holding-dollar text-4xl text-slate-400"></i>
              </div>
              <p className="text-center text-slate-500 uppercase tracking-[0.4em] text-xs font-black">
                {t('selectLoanToView')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Loan Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in">
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'} rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col`}>
            <div className="p-8 bg-emerald-600 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">New Loan</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-1">Setup a new credit line</p>
              </div>
              <button onClick={() => setShowLoanModal(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-8 md:p-10 space-y-8 overflow-y-auto scrollbar-hide">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Principal Amount</label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-2xl">₹</span>
                  <input 
                    type="number" 
                    className={`w-full pl-14 pr-6 py-6 rounded-3xl font-black text-3xl outline-none focus:ring-8 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-emerald-900/20' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-emerald-50'}`}
                    value={newLoanData.principal || ''} 
                    onChange={e => setNewLoanData({...newLoanData, principal: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Interest (%)</label>
                  <input 
                    type="number" 
                    className={`w-full px-6 py-5 rounded-3xl font-black text-xl outline-none focus:ring-8 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-emerald-900/20' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-emerald-50'}`}
                    value={newLoanData.interestRate} 
                    onChange={e => setNewLoanData({...newLoanData, interestRate: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Due Day</label>
                  <input 
                    type="number" 
                    min="1" max="31"
                    className={`w-full px-6 py-5 rounded-3xl font-black text-xl outline-none focus:ring-8 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-emerald-900/20' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-emerald-50'}`}
                    value={newLoanData.dueDate} 
                    onChange={e => setNewLoanData({...newLoanData, dueDate: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Start Date</label>
                <input 
                  type="date" 
                  className={`w-full px-6 py-5 rounded-3xl font-black text-lg outline-none focus:ring-8 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-emerald-900/20' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-emerald-50'}`}
                  value={newLoanData.startDate} 
                  onChange={e => setNewLoanData({...newLoanData, startDate: e.target.value})}
                />
              </div>
              <button onClick={handleAddLoan} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all transform hover:-translate-y-1">
                Create Loan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals & Popups */}
      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCustomer}
        title={t('confirmDelete')}
        message={t('deleteWarning')}
        confirmLabel={t('deleteBtn')}
        variant="danger"
      />

      <ConfirmationModal 
        isOpen={showAdjustmentConfirm}
        onClose={() => setShowAdjustmentConfirm(false)}
        onConfirm={handleUpdatePrincipal}
        title={t('confirmAdjustment')}
        message={t('adjustmentWarning')}
        variant="primary"
      />

      {showPrincipalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'} rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden border`}>
            <div className="p-6 bg-violet-600 text-white flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-tighter">{t('adjustment')}</h3>
              <button onClick={() => setShowPrincipalModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className={`flex p-1 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <button 
                  onClick={() => setPrincipalChange({...principalChange, type: 'increase'})}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${principalChange.type === 'increase' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  {t('lend')}
                </button>
                <button 
                  onClick={() => setPrincipalChange({...principalChange, type: 'decrease'})}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${principalChange.type === 'decrease' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  {t('recover')}
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('amount')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                  <input 
                    type="number" 
                    className={`w-full pl-9 pr-4 py-4 rounded-2xl font-black text-xl outline-none focus:ring-4 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`}
                    value={principalChange.amount || ''} 
                    onChange={e => setPrincipalChange({...principalChange, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('notes')}</label>
                <input 
                  type="text" 
                  placeholder="Reason..."
                  className={`w-full px-4 py-4 rounded-2xl font-bold text-sm outline-none focus:ring-4 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`}
                  value={principalChange.reason} 
                  onChange={e => setPrincipalChange({...principalChange, reason: e.target.value})}
                />
              </div>
              <button onClick={handleUpdatePrincipal} className="w-full bg-violet-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-violet-200 hover:bg-violet-700 active:scale-[0.98]">
                {t('submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'} rounded-[2rem] w-full max-sm shadow-2xl overflow-hidden border`}>
            <div className="p-6 bg-violet-600 text-white flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-tighter">{t('collect')}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-5">
              <div className={`p-5 rounded-[1.5rem] border ${isDark ? 'bg-violet-900/20 border-violet-900/40' : 'bg-violet-50 border-violet-100'}`}>
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-1">{t('expectedInterest')}</p>
                <p className="text-2xl font-black text-violet-500">₹{((selectedLoan.principal * selectedLoan.interestRate)/100).toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('month')}</label>
                  <select 
                    className={`w-full px-3 py-3.5 border rounded-2xl font-bold text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                    value={paymentInput.month}
                    onChange={e => setPaymentInput({...paymentInput, month: parseInt(e.target.value)})}
                  >
                    {Array.from({length: 12}).map((_, i) => (
                      <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('year')}</label>
                  <select 
                    className={`w-full px-3 py-3.5 border rounded-2xl font-bold text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                    value={paymentInput.year}
                    onChange={e => setPaymentInput({...paymentInput, year: parseInt(e.target.value)})}
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('amount')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-500">₹</span>
                  <input 
                    type="number" 
                    className={`w-full pl-9 pr-4 py-4 rounded-2xl font-black text-xl outline-none focus:ring-4 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-emerald-400 focus:ring-emerald-900/30' : 'bg-slate-50 border-slate-100 text-emerald-600 focus:ring-emerald-50'}`}
                    value={paymentInput.amount || ''} 
                    onChange={e => setPaymentInput({...paymentInput, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <button onClick={handleAddPayment} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-50 hover:bg-emerald-700 active:scale-[0.98]">
                {t('collect')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
