
import React from 'react';
import { Invoice, BalanceSheet, CustomerProfile, SUPPORTED_CURRENCIES } from '../types';
import BillTable from './BillTable';
import { formatMoney, getDerivedStatus } from '../utils/formatters';

interface DashboardProps {
  invoices: Invoice[];
  profiles: CustomerProfile[];
  balanceSheet: BalanceSheet;
  onOpenScanner: () => void;
  onOpenManual: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMarkPaid: (ids: string[]) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  preferredCurrency: string;
  onPreferredCurrencyChange: (currency: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  invoices, 
  profiles,
  balanceSheet, 
  onOpenScanner, 
  onOpenManual, 
  onEditInvoice,
  onBulkDelete,
  onBulkMarkPaid,
  isDarkMode,
  onToggleDarkMode,
  preferredCurrency,
  onPreferredCurrencyChange
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = React.useState(false);

  const expensesByCurrency = invoices.reduce((acc, inv) => {
    if (inv.type === 'expense') {
      acc[inv.currency] = (acc[inv.currency] || 0) + inv.total;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-white dark:bg-black shadow-sm relative overflow-hidden flex flex-col pb-24 transition-colors">
      {/* Header */}
      <header className="p-6 pb-0 flex justify-between items-center relative z-20">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Financial Hub</h1>
          <p className="text-gray-400 dark:text-zinc-500 text-sm font-medium">Automated Expense Intelligence</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-zinc-800 transition-all hover:scale-105 font-bold text-[10px]"
            >
              {preferredCurrency}
            </button>
            {showCurrencyDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-2 animate-in fade-in slide-in-from-top-2 overflow-hidden z-50">
                <p className="text-[8px] font-black uppercase text-gray-400 dark:text-zinc-500 p-2 tracking-widest">Base Currency</p>
                <div className="max-h-48 overflow-y-auto scrollbar-hide">
                  {SUPPORTED_CURRENCIES.map(curr => (
                    <button 
                      key={curr.code}
                      onClick={() => {
                        onPreferredCurrencyChange(curr.code);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-colors flex justify-between items-center ${preferredCurrency === curr.code ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                    >
                      <span>{curr.name}</span>
                      <span>{curr.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={onToggleDarkMode}
            className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-zinc-800 transition-all hover:scale-105"
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>
      </header>

      {/* Balance Card */}
      <div className="p-6">
        <div className="bg-zinc-900 dark:bg-zinc-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="relative z-10">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Total Expenses (Base {preferredCurrency})</p>
            <h2 className="text-4xl font-black mb-6">
              {formatMoney(expensesByCurrency[preferredCurrency] || 0, preferredCurrency)}
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex flex-col justify-center">
                <p className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Total Bills</p>
                <p className="text-xl font-black">{invoices.length}</p>
              </div>
              <div className={`p-4 rounded-3xl border flex flex-col justify-center transition-colors ${
                invoices.some(i => getDerivedStatus(i.dueDate, i.status) === 'OVERDUE')
                ? 'bg-rose-500/20 border-rose-500/30'
                : 'bg-white/5 border-white/10'
              }`}>
                <p className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Overdue</p>
                <p className={`text-xl font-black ${invoices.some(i => getDerivedStatus(i.dueDate, i.status) === 'OVERDUE') ? 'text-rose-400' : ''}`}>
                  {invoices.filter(i => getDerivedStatus(i.dueDate, i.status) === 'OVERDUE').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile/Customer Summary */}
      {profiles.length > 0 && (
        <div className="px-6 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-4">Saved Profiles</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {profiles.map(profile => (
              <div key={profile.id} className="min-w-[140px] p-4 bg-gray-50 dark:bg-zinc-900 rounded-[2rem] border border-gray-100 dark:border-zinc-800 flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                  <i className="fas fa-user-tie"></i>
                </div>
                <p className="text-xs font-black text-gray-900 dark:text-white truncate w-full text-center">{profile.name}</p>
                <p className="text-[10px] text-gray-400">{profile.invoiceCount} Bills</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="flex-1 bg-gray-50/30 dark:bg-black px-6 py-4">
        {invoices.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
              <i className="fas fa-camera text-2xl"></i>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">No Invoices Yet</p>
            <p className="text-gray-400 dark:text-zinc-500 text-sm max-w-[220px] mx-auto mt-2">
              Snap a photo of any bill to automatically extract details and track spending.
            </p>
          </div>
        ) : (
          <BillTable 
            invoices={invoices} 
            onEdit={onEditInvoice} 
            onBulkDelete={onBulkDelete}
            onBulkMarkPaid={onBulkMarkPaid}
          />
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-40">
        {showMenu && (
          <div className="mb-4 space-y-3 flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-500">
            <button 
              onClick={() => { setShowMenu(false); onOpenManual(); }}
              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-6 py-4 rounded-[1.5rem] shadow-2xl border border-gray-100 dark:border-zinc-800 flex items-center gap-3 font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95 transition-all w-48 group"
            >
              <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
                <i className="fas fa-keyboard text-zinc-600 dark:text-zinc-400 text-sm"></i>
              </div>
              Manual Entry
            </button>
            <button 
              onClick={() => { setShowMenu(false); onOpenScanner(); }}
              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-6 py-4 rounded-[1.5rem] shadow-2xl border border-gray-100 dark:border-zinc-800 flex items-center gap-3 font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95 transition-all w-48 group"
            >
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800">
                <i className="fas fa-camera text-blue-600 dark:text-blue-400 text-sm"></i>
              </div>
              Scan Image
            </button>
          </div>
        )}
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className={`w-16 h-16 rounded-[2.2rem] shadow-2xl flex items-center justify-center transition-all duration-700 ${
            showMenu ? 'bg-zinc-900 dark:bg-white rotate-[135deg] text-white dark:text-black scale-90' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200 ring-4 ring-blue-50 dark:ring-blue-900/20'
          }`}
        >
          <i className="fas fa-plus text-2xl"></i>
        </button>
      </div>

      {(showMenu || showCurrencyDropdown) && (
        <div 
          className="fixed inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-md z-30"
          onClick={() => { setShowMenu(false); setShowCurrencyDropdown(false); }}
        ></div>
      )}
    </div>
  );
};

export default Dashboard;
