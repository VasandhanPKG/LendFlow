
import React, { useState } from 'react';
import { useApp } from '../AppContext';

const Settings: React.FC = () => {
  const { t, settings, updateSettings } = useApp();
  const [formData, setFormData] = useState({ ...settings });

  const themePresets = [
    { name: 'Divine Ganesha', mode: 'light', url: 'https://images.unsplash.com/photo-1561059488-916d69792237?q=80&w=2600' },
    { name: 'Modern Navy', mode: 'light', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2600' },
    { name: 'Arctic White', mode: 'light', url: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=2600' },
    { name: 'Midnight Tech', mode: 'dark', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2600' },
    { name: 'Emerald Forest', mode: 'dark', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560' },
    { name: 'Royal Gold', mode: 'light', url: 'https://images.unsplash.com/photo-1502262439-f48ef230bc71?q=80&w=2600' },
    { name: 'Deep Obsidian', mode: 'dark', url: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2600' }
  ];

  const colorOptions = [
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Rose', hex: '#e11d48' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Sky', hex: '#0284c7' },
    { name: 'Amber', hex: '#d97706' },
    { name: 'Slate', hex: '#334155' }
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    // alert('Settings saved successfully!');
  };

  const isDark = formData.themeMode === 'dark';

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-2xl mx-auto pb-12">
      <header className="px-1 text-center md:text-left">
        <h2 className={`text-3xl md:text-4xl font-black tracking-tight uppercase ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('settings')}</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium text-sm md:text-base`}>Customize your branding and application theme.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <div className={`${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white'} p-6 md:p-10 rounded-[2rem] border shadow-sm space-y-8`}>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('financeName')}</label>
            <input 
              type="text" 
              className={`w-full px-5 py-4 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-100 text-slate-800'} border rounded-2xl font-black outline-none focus:ring-4 focus:ring-violet-500/20 transition-all text-base`}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('logoLink')}</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                placeholder="https://example.com/logo.png"
                className={`flex-1 px-5 py-4 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-100 text-slate-700'} border rounded-2xl font-bold outline-none focus:ring-4 focus:ring-violet-500/20 transition-all text-sm`}
                value={formData.logoUrl}
                onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
              />
              <div className={`w-full sm:w-16 h-16 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} rounded-2xl flex items-center justify-center overflow-hidden border shrink-0`}>
                {formData.logoUrl ? <img src={formData.logoUrl} className="w-full h-full object-contain p-1" /> : <i className="fas fa-image text-slate-400"></i>}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">PDF Primary Color</label>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map(color => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setFormData({ ...formData, primaryColor: color.hex })}
                  className={`w-10 h-10 rounded-full border-4 transition-all ${formData.primaryColor === color.hex ? 'border-slate-400 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
              <input 
                type="color" 
                className="w-10 h-10 rounded-full overflow-hidden border-0 p-0 cursor-pointer bg-transparent"
                value={formData.primaryColor}
                onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic">This color will be used for headers and accents in exported PDF reports.</p>
          </div>
        </div>

        <div className={`${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white'} p-6 md:p-10 rounded-[2rem] border shadow-sm space-y-8`}>
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Application Language</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, language: 'en' })}
                className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.language === 'en' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, language: 'ta' })}
                className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.language === 'ta' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white'} p-6 md:p-10 rounded-[2rem] border shadow-sm space-y-8`}>
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('theme')}</label>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${formData.themeMode === 'light' ? 'text-violet-600' : 'text-slate-500'}`}>Light</span>
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, themeMode: isDark ? 'light' : 'dark' })}
                className={`w-12 h-6 rounded-full relative transition-colors ${isDark ? 'bg-violet-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDark ? 'left-7' : 'left-1'}`} />
              </button>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-violet-400' : 'text-slate-500'}`}>Dark</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {themePresets.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setFormData({ ...formData, backgroundUrl: preset.url, themeMode: preset.mode as 'light' | 'dark' })}
                className={`group relative h-24 md:h-28 rounded-2xl overflow-hidden border-4 transition-all ${formData.backgroundUrl === preset.url ? 'border-violet-600 scale-[1.02] shadow-xl' : `border-transparent ${isDark ? 'hover:border-slate-600' : 'hover:border-violet-200'}`}`}
              >
                <img src={preset.url} className="w-full h-full object-cover" alt={preset.name} />
                <div className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center transition-opacity ${formData.backgroundUrl === preset.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                   <span className="text-white text-[8px] font-black uppercase tracking-widest text-center px-2">{preset.name}</span>
                   <span className="text-white/60 text-[7px] font-bold uppercase mt-1">{preset.mode}</span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Wallpaper URL</label>
            <input 
              type="text" 
              className={`w-full px-5 py-4 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'} border rounded-2xl font-bold outline-none text-sm`}
              value={formData.backgroundUrl}
              onChange={e => setFormData({ ...formData, backgroundUrl: e.target.value })}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-violet-600 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-violet-700 transition-all shadow-xl shadow-violet-200 active:scale-95"
        >
          {t('updateBranding')}
        </button>
      </form>
    </div>
  );
};

export default Settings;
