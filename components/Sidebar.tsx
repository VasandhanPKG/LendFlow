
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useApp } from '../AppContext';

interface SidebarProps {
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen, onClose }) => {
  const { t, settings, profile } = useApp();
  
  const navItems = [
    { to: '/', icon: 'fa-chart-pie', label: t('dashboard'), tooltip: 'View portfolio performance' },
    { to: '/customers', icon: 'fa-users', label: t('customers'), tooltip: 'Manage borrower ledger' },
    { to: '/transactions', icon: 'fa-receipt', label: t('transactions'), tooltip: 'View monthly ledger' },
    { to: '/reports', icon: 'fa-file-invoice-dollar', label: t('reports'), tooltip: 'Generate statements' },
    { to: '/settings', icon: 'fa-cog', label: t('settings'), tooltip: 'Customize Branding & Themes' },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-72 ${settings.themeMode === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-2xl border-r 
    transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) md:relative md:translate-x-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    flex flex-col shadow-[8px_0_32px_rgba(0,0,0,0.04)]
  `;

  return (
    <aside className={sidebarClasses}>
      <div className="p-10 hidden md:block">
        <h1 className="text-2xl font-black text-violet-600 flex items-center gap-3 tracking-tighter leading-tight uppercase">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-lg shadow-lg shadow-violet-200 overflow-hidden shrink-0 transform hover:rotate-12 transition-transform">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <i className="fas fa-om"></i>
            )}
          </div>
          <span className="truncate bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">{settings.name}</span>
        </h1>
      </div>
      
      <div className={`p-8 md:hidden border-b ${settings.themeMode === 'dark' ? 'border-slate-800' : 'border-slate-50'} mb-6 flex items-center gap-4`}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-violet-100">
           {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <i className="fas fa-om"></i>
            )}
        </div>
        <h1 className="text-2xl font-black text-violet-600 tracking-tighter uppercase truncate bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
          {settings.name}
        </h1>
      </div>

      <div className="px-8 mb-8">
        <Link 
          to="/profile" 
          onClick={onClose}
          className={`flex items-center gap-4 p-4 ${settings.themeMode === 'dark' ? 'bg-slate-800/40 hover:bg-slate-800 border-slate-700' : 'bg-slate-50/40 hover:bg-white border-slate-100'} rounded-[2rem] border transition-all group hover:shadow-xl hover:shadow-slate-200/50 active:scale-95`}
        >
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md shrink-0 group-hover:scale-110 transition-transform">
            <img src={profile.avatarUrl} alt="Admin" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-black ${settings.themeMode === 'dark' ? 'text-slate-100' : 'text-slate-800'} truncate leading-tight mb-0.5`}>{profile.displayName}</p>
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest opacity-80">{profile.role}</p>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 px-6 space-y-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            title={item.tooltip}
            className={({ isActive }) =>
              `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-200 font-bold translate-x-2 scale-105'
                  : `${settings.themeMode === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-500 hover:bg-violet-50/80 hover:text-violet-600'}`
              }`
            }
          >
            <i className={`fas ${item.icon} text-lg w-6 group-hover:rotate-12 transition-transform`}></i>
            <span className="font-black uppercase tracking-widest text-[11px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={`p-8 border-t ${settings.themeMode === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
        <button
          onClick={onLogout}
          className={`flex items-center gap-4 px-5 py-4 w-full text-left rounded-2xl transition-all duration-300 font-black uppercase tracking-widest text-[11px] ${settings.themeMode === 'dark' ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-900/20' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
        >
          <i className="fas fa-sign-out-alt text-lg w-6"></i>
          {t('logout')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
