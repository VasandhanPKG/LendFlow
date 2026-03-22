
import React, { useState } from 'react';
import { useApp } from '../AppContext';

const Profile: React.FC = () => {
  const { t, profile, updateProfile } = useApp();
  const [formData, setFormData] = useState({ ...profile });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
    alert('Profile updated successfully!');
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-2xl mx-auto pb-12">
      <header className="px-1 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase">{t('profile')}</h2>
        <p className="text-slate-500 font-medium text-sm md:text-base">{t('personalDetails')}</p>
      </header>

      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="relative group">
          <div className="w-36 h-36 md:w-48 md:h-48 rounded-[3rem] bg-white border-8 border-white shadow-2xl overflow-hidden ring-4 ring-violet-50">
            <img src={formData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-violet-600 text-white w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-lg border-4 border-white transition-transform hover:scale-110">
            <i className="fas fa-camera text-sm"></i>
          </div>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-black text-slate-900 leading-tight">{formData.displayName}</h3>
          <p className="text-sm font-black text-violet-600 uppercase tracking-[0.2em]">{formData.role}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('displayName')}</label>
              <input 
                type="text" 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-violet-50 transition-all text-base"
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('role')}</label>
              <input 
                type="text" 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-violet-50 transition-all text-base"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('emailAddress')}</label>
            <input 
              type="email" 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-violet-50 transition-all text-base"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('avatarLink')}</label>
            <input 
              type="text" 
              placeholder="https://..."
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:ring-4 focus:ring-violet-50 transition-all text-sm"
              value={formData.avatarUrl}
              onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-violet-600 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-violet-700 transition-all shadow-xl shadow-violet-200 active:scale-95"
        >
          {t('updateProfile')}
        </button>
      </form>
    </div>
  );
};

export default Profile;
