
export interface Loan {
  id: string;
  customerId: string;
  principal: number;
  interestRate: number; // Monthly percentage
  dueDate: number; // Day of the month (1-31)
  startDate: number; // Loan start timestamp
  createdAt: number;
  status: 'Active' | 'Closed';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  referrer: string;
  createdAt: number;
  // Legacy fields for backward compatibility during migration if needed
  principal?: number;
  interestRate?: number;
  dueDate?: number;
  startDate?: number;
}

export interface Payment {
  id: string;
  customerId: string;
  loanId: string; // Link to specific loan
  month: number; // 0-11
  year: number;
  amountPaid: number;
  totalDue: number;
  status: 'Paid' | 'Partial' | 'Pending';
  timestamp: number;
}

export interface PrincipalLog {
  id: string;
  customerId: string;
  loanId: string; // Link to specific loan
  amountChange: number;
  newPrincipal: number;
  reason: string;
  timestamp: number;
}

export interface FinanceSettings {
  name: string;
  logoUrl: string;
  backgroundUrl: string;
  themeMode: 'light' | 'dark';
  primaryColor: string; // Hex color for PDF branding
  language: 'en' | 'ta';
}

export interface ProfileSettings {
  displayName: string;
  email: string;
  avatarUrl: string;
  role: string;
}

export interface AdminUser {
  email: string;
}
