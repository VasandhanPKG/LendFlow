
import React, { useState, useEffect } from 'react';
import { Customer, Loan } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '../AppContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const Reports: React.FC = () => {
  const { t, settings, user } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user) return;
    const customersRef = collection(db, 'users', user.uid, 'customers');
    const loansRef = collection(db, 'users', user.uid, 'loans');

    const unsubC = onSnapshot(customersRef, (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });
    const unsubL = onSnapshot(loansRef, (snap) => {
      setLoans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
    });
    return () => { unsubC(); unsubL(); };
  }, [user]);

  const generatePDF = async (m: number = selectedMonth, y: number = selectedYear) => {
    const doc = new jsPDF();
    const monthName = new Date(y, m).toLocaleString('default', { month: 'long' });

    // 1. HEADER SECTION (Ledger Style)
    const primaryColor = settings.primaryColor || '#7c3aed';
    const rgb = hexToRgb(primaryColor);
    
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const title = settings.name.toUpperCase();
    doc.text(title, 15, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const subTitle = `${monthName.toUpperCase()} - ${y} STATEMENT`;
    doc.text(subTitle, 15, 33);

    // 2. MAIN DATA TABLE
    const activeLoans = loans.filter(l => l.status === 'Active');
    
    // Sort by due day to match the ledger style
    const sortedLoans = [...activeLoans].sort((a, b) => a.dueDate - b.dueDate);

    const tableData = sortedLoans.map((l, index) => {
      const customer = customers.find(c => c.id === l.customerId);
      const interestDue = (l.principal * l.interestRate) / 100;
      
      return [
        `${index + 1}`,
        l.dueDate.toString().padStart(2, '0'),
        customer?.referrer || '-',
        customer?.name || 'Unknown',
        `Rs. ${l.principal.toLocaleString()}`,
        customer?.phone || 'N/A',
        `Rs. ${interestDue.toLocaleString()}`,
        l.dueDate.toString().padStart(2, '0')
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: [['S.No', 'Day', 'Referrer', 'Name', 'Principal', 'Phone', 'Interest', 'Due Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [rgb.r, rgb.g, rgb.b],
        textColor: 255, 
        fontSize: 10, 
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 3, 
        valign: 'middle',
        textColor: 50,
        font: 'helvetica',
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 12 },
        2: { cellWidth: 25 },
        4: { halign: 'right', cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { halign: 'right', cellWidth: 30 },
        7: { halign: 'center', cellWidth: 18 }
      }
    });

    // 3. FOOTER
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 50;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Active Loans: ${activeLoans.length}`, 15, finalY + 15);
    doc.text(`Total Principal: Rs. ${activeLoans.reduce((sum, l) => sum + l.principal, 0).toLocaleString()}`, 15, finalY + 22);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 285);
    doc.text(`Page 1`, 195, 285, { align: 'right' });

    doc.save(`${settings.name.replace(/\s/g, '_')}_Report_${monthName}_${y}.pdf`);
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 124, g: 58, b: 237 }; // Default violet
  };

  const isDark = settings.themeMode === 'dark';

  return (
    <div className="space-y-6 md:space-y-8 animate-in pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 px-1">
        <div>
          <h2 className={`text-2xl md:text-3xl font-black tracking-tight uppercase ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{settings.name}</h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium text-xs md:text-base`}>Professional monthly statements.</p>
        </div>
        <button 
          onClick={() => { setSelectedMonth(new Date().getMonth()); setSelectedYear(new Date().getFullYear()); }}
          className={`text-[10px] font-black hover:bg-violet-50 px-3 py-1.5 rounded-xl transition-all uppercase tracking-widest ${isDark ? 'text-violet-400 hover:bg-slate-800' : 'text-violet-600'}`}
        >
          {t('clear')}
        </button>
      </header>

      <div className={`${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} p-8 md:p-14 rounded-[2.5rem] border shadow-2xl max-w-2xl mx-auto text-center relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        
        <div className="relative z-10 space-y-8">
          <div className={`w-20 h-20 md:w-24 md:h-24 ${isDark ? 'bg-violet-900/30' : 'bg-violet-50'} text-violet-600 rounded-[2.5rem] flex items-center justify-center text-3xl mx-auto shadow-inner border border-violet-100/20`}>
            {settings.logoUrl ? (
               <img src={settings.logoUrl} className="w-full h-full object-contain p-2" />
            ) : (
               <i className="fas fa-file-invoice-dollar"></i>
            )}
          </div>

          <div>
            <h3 className={`text-2xl md:text-3xl font-black mb-2 uppercase tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('statementCenter')}</h3>
            <p className={`text-sm max-w-sm mx-auto font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Generate a high-fidelity PDF ledger for your records or collection reminders.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-left space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('month')}</label>
              <select 
                className={`w-full p-4 border rounded-2xl outline-none focus:ring-4 focus:ring-violet-500/10 font-black text-sm appearance-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i} value={i}>{new Date(0, i).toLocaleString('default', {month: 'long'})}</option>
                ))}
              </select>
            </div>
            <div className="text-left space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('year')}</label>
              <select 
                className={`w-full p-4 border rounded-2xl outline-none focus:ring-4 focus:ring-violet-500/10 font-black text-sm appearance-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={() => generatePDF()}
              className="w-full bg-violet-600 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-violet-700 transition-all shadow-xl shadow-violet-200 flex items-center justify-center gap-3 active:scale-95 group"
            >
              <i className="fas fa-file-pdf text-xl transition-transform group-hover:rotate-12"></i>
              {t('exportPdf')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
