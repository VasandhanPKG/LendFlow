
import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { Language, translations } from './translations';
import { FinanceSettings, ProfileSettings } from './types';

export interface AppContextType {
  user: User | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  settings: FinanceSettings;
  updateSettings: (newSettings: FinanceSettings) => void;
  profile: ProfileSettings;
  updateProfile: (newProfile: ProfileSettings) => void;
  loading: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
