
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import AddCustomer from './pages/AddCustomer';
import CustomerDetails from './pages/CustomerDetails';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { Language, translations } from './translations';
import { FinanceSettings, ProfileSettings } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AppContext } from './AppContext';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<FinanceSettings>({
    name: 'LendFlow Admin',
    logoUrl: '',
    backgroundUrl: 'https://images.unsplash.com/photo-1561059488-916d69792237?q=80&w=2600',
    themeMode: 'light',
    primaryColor: '#7c3aed',
    language: 'en'
  });

  const [profile, setProfile] = useState<ProfileSettings>({
    displayName: 'New Owner',
    email: '',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    role: 'Owner'
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const settingsRef = doc(db, 'users', currentUser.uid, 'config', 'settings');
        const profileRef = doc(db, 'users', currentUser.uid, 'config', 'profile');
        
        const [settingsSnap, profileSnap] = await Promise.all([
          getDoc(settingsRef),
          getDoc(profileRef)
        ]);

        if (settingsSnap.exists()) setSettings(settingsSnap.data() as FinanceSettings);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as ProfileSettings);
        } else {
          const initProfile: ProfileSettings = {
            displayName: currentUser.displayName || 'New Owner',
            email: currentUser.email || '',
            avatarUrl: currentUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            role: 'Owner'
          };
          await setDoc(profileRef, initProfile);
          setProfile(initProfile);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.backgroundImage = `url('${settings.backgroundUrl}')`;
    document.body.className = `text-slate-900 selection:bg-violet-100 selection:text-violet-900 font-sans theme-${settings.themeMode}`;
    if (settings.themeMode === 'dark') {
      document.body.classList.add('text-slate-100');
      document.body.classList.remove('text-slate-900');
    } else {
      document.body.classList.add('text-slate-900');
      document.body.classList.remove('text-slate-100');
    }
  }, [settings.backgroundUrl, settings.themeMode]);

  const setLanguage = (lang: Language) => {
    updateSettings({ ...settings, language: lang });
  };

  const updateSettings = async (newSettings: FinanceSettings) => {
    if (!user) return;
    setSettings(newSettings);
    await setDoc(doc(db, 'users', user.uid, 'config', 'settings'), newSettings);
  };

  const updateProfile = async (newProfile: ProfileSettings) => {
    if (!user) return;
    setProfile(newProfile);
    await setDoc(doc(db, 'users', user.uid, 'config', 'profile'), newProfile);
  };

  const t = (key: keyof typeof translations.en) => translations[settings.language][key] || translations.en[key];

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 text-violet-600 font-black animate-pulse uppercase tracking-[0.2em] text-xs">Initializing Security...</div>;
  }

  if (!user) {
    return (
      <AppContext.Provider value={{ user, language: settings.language, setLanguage, t, settings, updateSettings, profile, updateProfile, loading: authLoading }}>
        <Login onLogin={() => {}} />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ user, language: settings.language, setLanguage, t, settings, updateSettings, profile, updateProfile, loading: authLoading }}>
      <HashRouter>
        <div className="flex h-screen bg-transparent overflow-hidden relative">
          {/* Mobile Overlay for Sidebar */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] md:hidden animate-in"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Top Bar Navigation (Mobile Focused) */}
          <div className="fixed top-0 left-0 right-0 z-[50] flex items-center justify-between px-4 py-3 md:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`${settings.themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-600'} backdrop-blur-md border w-10 h-10 rounded-xl shadow-lg flex items-center justify-center active:scale-90`}
            >
              <i className="fas fa-bars"></i>
            </button>
            
            <button
              onClick={() => setLanguage(settings.language === 'en' ? 'ta' : 'en')}
              className={`${settings.themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-600'} backdrop-blur-md border px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2`}
            >
              <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-black">{settings.language === 'en' ? 'EN' : 'TA'}</div>
            </button>
          </div>

          {/* Desktop Language Toggle */}
          <div className="fixed top-6 right-8 z-[60] hidden md:flex items-center">
            <button
              onClick={() => setLanguage(settings.language === 'en' ? 'ta' : 'en')}
              className={`${settings.themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-600'} backdrop-blur-md border px-4 py-2 rounded-full shadow-lg hover:shadow-violet-200 transition-all flex items-center gap-3 group active:scale-95`}
            >
              <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black">{settings.language === 'en' ? 'EN' : 'TA'}</div>
              <span className="text-xs font-black uppercase tracking-widest">{settings.language === 'en' ? 'தமிழ்' : 'English'}</span>
            </button>
          </div>

          <Sidebar onLogout={handleLogout} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          
          <main className="flex-1 overflow-y-auto pt-20 md:pt-12 px-4 pb-12 md:px-8">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/new" element={<AddCustomer />} />
                <Route path="/customers/:id" element={<CustomerDetails />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
