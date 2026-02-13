
import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import InvoiceForm from './components/InvoiceForm';
import { Invoice, ViewState, BalanceSheet, CustomerProfile, InvoiceItem } from './types';
import { extractInvoiceData } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [scannedData, setScannedData] = useState<Partial<Invoice> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  
  const [preferredCurrency, setPreferredCurrency] = useState(() => {
    return localStorage.getItem('preferred_currency') || 'INR';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const savedInvoices = localStorage.getItem('smart_invoices_v3');
    const savedProfiles = localStorage.getItem('smart_profiles_v3');
    if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
    if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
  }, []);

  useEffect(() => {
    localStorage.setItem('smart_invoices_v3', JSON.stringify(invoices));
    localStorage.setItem('smart_profiles_v3', JSON.stringify(profiles));
  }, [invoices, profiles]);

  const handlePreferredCurrencyChange = (curr: string) => {
    setPreferredCurrency(curr);
    localStorage.setItem('preferred_currency', curr);
  };

  const balanceSheet = useMemo((): BalanceSheet => {
    const totalExpenses = invoices
      .filter(inv => inv.type === 'expense')
      .reduce((sum, inv) => sum + inv.total, 0);
    
    return {
      totalRevenue: 0,
      totalExpenses,
      netBalance: -totalExpenses
    };
  }, [invoices]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const validateInvoice = (data: any): boolean => {
    if (!data.vendorName || data.vendorName.trim() === '') return false;
    if (!data.date || !data.dueDate) return false;
    if (!data.items || data.items.length === 0) return false;
    const itemsValid = data.items.every((it: any) => it.description && it.quantity > 0 && it.rate >= 0);
    return itemsValid;
  };

  const handleCapture = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const data = await extractInvoiceData(base64);
      const formattedItems: InvoiceItem[] = data.items.map((it: any) => ({
        id: crypto.randomUUID(),
        description: it.description || 'Item',
        quantity: it.quantity || 1,
        rate: it.rate || 0
      }));

      const total = formattedItems.reduce((sum, it) => sum + (it.quantity * it.rate), 0);
      
      const invoiceTemplate: Partial<Invoice> = {
        vendorName: data.vendorName,
        date: data.date,
        dueDate: data.dueDate,
        currency: data.currency || preferredCurrency,
        items: formattedItems,
        total: total,
        category: data.category || 'General',
        tags: data.tags || [],
        status: 'UNPAID',
        type: 'expense',
        updatedAt: new Date().toISOString()
      };

      // Auto-save logic: If data is valid and complete, save immediately
      if (validateInvoice(invoiceTemplate)) {
        handleSaveInvoice({
          ...invoiceTemplate,
          id: crypto.randomUUID()
        } as Invoice);
        showNotification("Invoice auto-extracted and saved!");
        setView('DASHBOARD');
      } else {
        setScannedData(invoiceTemplate);
        setView('EDITING');
      }
    } catch (err: any) {
      showNotification(err.message || "OCR failed. Please enter details manually.", 'error');
      setScannedData({ status: 'UNPAID', currency: preferredCurrency });
      setView('EDITING');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    setInvoices(prevInvoices => {
      const existingInvoice = prevInvoices.find(inv => inv.id === invoice.id);
      let updatedProfiles = [...profiles];

      if (existingInvoice) {
        const oldProfileIndex = updatedProfiles.findIndex(p => p.name.toLowerCase() === existingInvoice.vendorName.toLowerCase());
        if (oldProfileIndex > -1) {
          updatedProfiles[oldProfileIndex] = {
            ...updatedProfiles[oldProfileIndex],
            invoiceCount: Math.max(0, updatedProfiles[oldProfileIndex].invoiceCount - 1),
            totalSpent: Math.max(0, updatedProfiles[oldProfileIndex].totalSpent - existingInvoice.total)
          };
        }
      }

      const newProfileIndex = updatedProfiles.findIndex(p => p.name.toLowerCase() === invoice.vendorName.toLowerCase());
      let finalProfileId;

      if (newProfileIndex > -1) {
        updatedProfiles[newProfileIndex] = {
          ...updatedProfiles[newProfileIndex],
          invoiceCount: updatedProfiles[newProfileIndex].invoiceCount + 1,
          totalSpent: updatedProfiles[newProfileIndex].totalSpent + invoice.total,
          lastInvoiceDate: invoice.date
        };
        finalProfileId = updatedProfiles[newProfileIndex].id;
      } else {
        finalProfileId = crypto.randomUUID();
        updatedProfiles.push({
          id: finalProfileId,
          name: invoice.vendorName,
          invoiceCount: 1,
          totalSpent: invoice.total,
          lastInvoiceDate: invoice.date
        });
      }

      updatedProfiles = updatedProfiles.filter(p => p.invoiceCount > 0 || p.name.toLowerCase() === invoice.vendorName.toLowerCase());
      setProfiles(updatedProfiles);
      
      const invoiceWithProfile = { ...invoice, profileId: finalProfileId, updatedAt: new Date().toISOString() };
      if (existingInvoice) {
        return prevInvoices.map(inv => inv.id === invoice.id ? invoiceWithProfile : inv);
      }
      return [invoiceWithProfile, ...prevInvoices];
    });

    setView('DASHBOARD');
    setScannedData(null);
  };

  const handleBulkDelete = (ids: string[]) => {
    if (confirm(`Are you sure you want to delete ${ids.length} selected invoices?`)) {
      setInvoices(prev => prev.filter(inv => !ids.includes(inv.id)));
      showNotification(`Deleted ${ids.length} invoices`);
    }
  };

  const handleBulkMarkPaid = (ids: string[]) => {
    setInvoices(prev => prev.map(inv => ids.includes(inv.id) ? { ...inv, status: 'PAID', updatedAt: new Date().toISOString() } : inv));
    showNotification(`Marked ${ids.length} invoices as Paid`);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setScannedData(invoice);
    setView('EDITING');
  };

  const renderView = () => {
    switch (view) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            invoices={invoices}
            profiles={profiles}
            balanceSheet={balanceSheet}
            onOpenScanner={() => setView('SCANNING')}
            onOpenManual={() => {
              setScannedData({ currency: preferredCurrency });
              setView('EDITING');
            }}
            onEditInvoice={handleEditInvoice}
            onBulkDelete={handleBulkDelete}
            onBulkMarkPaid={handleBulkMarkPaid}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            preferredCurrency={preferredCurrency}
            onPreferredCurrencyChange={handlePreferredCurrencyChange}
          />
        );
      case 'SCANNING':
        return (
          <Scanner 
            onCapture={handleCapture}
            onCancel={() => setView('DASHBOARD')}
          />
        );
      case 'EDITING':
        return (
          <InvoiceForm 
            initialData={scannedData || undefined}
            isLoading={isAnalyzing}
            onSave={handleSaveInvoice}
            profiles={profiles}
            onCancel={() => {
              setView('DASHBOARD');
              setScannedData(null);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-black min-h-screen transition-colors">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-zinc-900 text-white dark:bg-white dark:text-black'}`}>
          {notification.message}
        </div>
      )}
      {renderView()}
    </div>
  );
};

export default App;
