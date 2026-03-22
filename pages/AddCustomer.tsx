
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { Customer, Loan } from '../types';

const AddCustomer: React.FC = () => {
  const { t, settings, user } = useApp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '', 
    phone: '+91 ', 
    address: '', 
    referrer: '',
    principal: 0, 
    interestRate: 5, 
    dueDate: new Date().getDate(),
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      if (!user?.uid) {
        throw new Error("User not authenticated or UID missing.");
      }

      const batch = writeBatch(db);
      
      // 1. Create Customer
      const customerRef = doc(collection(db, 'users', user.uid, 'customers'));
      const customerData: Customer = {
        id: customerRef.id,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        referrer: formData.referrer.trim(),
        createdAt: Date.now()
      };
      batch.set(customerRef, customerData);

      // 2. Create Initial Loan
      const loanRef = doc(collection(db, 'users', user.uid, 'loans'));
      const principalValue = Number(formData.principal);
      const interestRateValue = Number(formData.interestRate);
      const dueDateValue = Number(formData.dueDate);
      
      const loanData: Loan = {
        id: loanRef.id,
        customerId: customerRef.id,
        principal: isNaN(principalValue) ? 0 : principalValue,
        interestRate: isNaN(interestRateValue) ? 0 : interestRateValue,
        dueDate: isNaN(dueDateValue) || dueDateValue < 1 || dueDateValue > 31 ? 1 : dueDateValue,
        startDate: new Date(formData.startDate).getTime() || Date.now(),
        createdAt: Date.now(),
        status: 'Active'
      };
      batch.set(loanRef, loanData);

      await batch.commit();
      navigate('/customers');
    } catch (err: unknown) {
      console.error("Error adding customer and loan:", err instanceof Error ? err.message : err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to save borrower: ${errorMessage}. Please check your connection or permissions.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = settings.themeMode === 'dark';

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 animate-in pb-12 px-1 md:px-0">
      <header className="flex flex-col gap-2 px-1">
        <button 
          onClick={() => navigate('/customers')}
          className={`w-fit text-[10px] font-black hover:bg-violet-50 px-4 py-2 rounded-xl uppercase tracking-widest transition-all mb-1 flex items-center ${isDark ? 'text-violet-400 hover:bg-slate-800' : 'text-violet-600'}`}
        >
          <i className="fas fa-arrow-left mr-2"></i> {t('back')}
        </button>
        <div>
          <h2 className={`text-2xl md:text-5xl font-black tracking-tight uppercase leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('enrollment')}</h2>
          <p className={`${isDark ? 'text-slate-500' : 'text-slate-500'} font-medium text-xs md:text-lg mt-1`}>Secure data entry for the private lending portfolio.</p>
        </div>
      </header>

      <form onSubmit={handleAddCustomer} className="space-y-6 md:space-y-10">
        {/* Borrower Identity Section */}
        <div className={`${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white'} rounded-[1.5rem] md:rounded-[3rem] border shadow-sm p-6 md:p-12 space-y-6 md:space-y-10 animate-in delay-1`}>
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-violet-600 text-white flex items-center justify-center text-base md:text-xl shadow-xl shadow-violet-200">
                <i className="fas fa-id-card"></i>
             </div>
             <div>
                <h3 className={`text-lg md:text-2xl font-black uppercase tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Identity Details</h3>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Personal and Contact Info</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('fullName')}</label>
              <input 
                required 
                type="text" 
                className={`w-full px-6 py-4 md:py-5 border rounded-2xl md:rounded-3xl font-bold text-base md:text-lg outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`} 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Borrower Full Name" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('contactNo')}</label>
              <input 
                required 
                type="tel" 
                className={`w-full px-6 py-4 md:py-5 border rounded-2xl md:rounded-3xl font-bold text-base md:text-lg outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`} 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                placeholder="+91" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('referrer')}</label>
              <input 
                type="text" 
                className={`w-full px-6 py-4 md:py-5 border rounded-2xl md:rounded-3xl font-bold text-base md:text-lg outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`} 
                value={formData.referrer} 
                onChange={e => setFormData({...formData, referrer: e.target.value})} 
                placeholder="Referrer Name" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('address')}</label>
            <textarea 
              rows={3} 
              className={`w-full px-6 py-4 md:py-5 border rounded-2xl md:rounded-3xl font-bold text-base md:text-lg outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`} 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
              placeholder="Residential address details..."
            ></textarea>
          </div>
        </div>

        {/* Loan Parameters Section */}
        <div className={`${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white'} rounded-[1.5rem] md:rounded-[3rem] border shadow-sm p-6 md:p-12 space-y-6 md:space-y-10 animate-in delay-2`}>
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-emerald-600 text-white flex items-center justify-center text-base md:text-xl shadow-xl shadow-emerald-100">
                <i className="fas fa-hand-holding-dollar"></i>
             </div>
             <div>
                <h3 className={`text-lg md:text-2xl font-black uppercase tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Financial Terms</h3>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Loan & Interest Params</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('openingCapital')} (₹)</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₹</span>
                <input 
                  required 
                  type="number" 
                  className={`w-full pl-12 pr-6 py-4 md:py-6 border rounded-2xl md:rounded-3xl font-black text-xl md:text-3xl outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-violet-400 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-violet-600 focus:ring-violet-50'}`} 
                  value={formData.principal === 0 ? '' : formData.principal} 
                  onChange={e => setFormData({...formData, principal: e.target.value === '' ? 0 : parseFloat(e.target.value)})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('startDate')}</label>
              <input 
                required 
                type="date" 
                className={`w-full px-6 py-4 md:py-6 border rounded-2xl md:rounded-3xl font-bold text-base md:text-lg outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`} 
                value={formData.startDate} 
                onChange={e => setFormData({...formData, startDate: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-10">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('interestRate')} (%)</label>
              <input 
                required 
                type="number" 
                step="0.1" 
                className={`w-full px-6 py-4 md:py-6 border rounded-2xl md:rounded-3xl font-black text-base md:text-xl outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`} 
                value={formData.interestRate} 
                onChange={e => setFormData({...formData, interestRate: e.target.value === '' ? 0 : parseFloat(e.target.value)})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('autoDueDay')}</label>
              <input 
                required 
                type="number" 
                min="1" 
                max="31" 
                className={`w-full px-6 py-4 md:py-6 border rounded-2xl md:rounded-3xl font-black text-base md:text-xl outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-violet-900/30' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-violet-50'}`} 
                value={formData.dueDate} 
                onChange={e => setFormData({...formData, dueDate: e.target.value === '' ? 1 : parseInt(e.target.value)})} 
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 pt-6 px-1">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 bg-violet-600 text-white py-5 md:py-7 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-lg md:text-2xl hover:bg-violet-700 transition-all shadow-2xl shadow-violet-200 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-user-plus mr-3"></i>}
            {t('enrollBtn')}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/customers')}
            className={`flex-1 py-5 md:py-7 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-lg md:text-2xl transition-all border-2 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomer;
