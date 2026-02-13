
import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { formatMoney, getDerivedStatus, isDueSoon } from '../utils/formatters';

interface BillTableProps {
  invoices: Invoice[];
  onEdit: (invoice: Invoice) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMarkPaid: (ids: string[]) => void;
}

type SortField = 'vendorName' | 'date' | 'dueDate' | 'total' | 'status';
type SortDir = 'asc' | 'desc';

const BillTable: React.FC<BillTableProps> = ({ invoices, onEdit, onBulkDelete, onBulkMarkPaid }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{field: SortField, dir: SortDir}>({ field: 'date', dir: 'desc' });
  const itemsPerPage = 5;

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = invoices;
    if (q) {
      result = result.filter(inv => {
        const vendorMatch = inv.vendorName.toLowerCase().includes(q);
        const itemsMatch = inv.items.some(item => item.description.toLowerCase().includes(q));
        const tagsMatch = inv.tags.some(tag => tag.toLowerCase().includes(q));
        return vendorMatch || itemsMatch || tagsMatch;
      });
    }

    return [...result].sort((a, b) => {
      const { field, dir } = sortConfig;
      let valA = a[field] as any;
      let valB = b[field] as any;

      if (field === 'status') {
        valA = getDerivedStatus(a.dueDate, a.status);
        valB = getDerivedStatus(b.dueDate, b.status);
      }

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, searchQuery, sortConfig]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedInvoices.map(inv => inv.id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const isRecentlyUpdated = (updatedAt: string) => {
    if (!updatedAt) return false;
    const diff = Date.now() - new Date(updatedAt).getTime();
    return diff < 1000 * 60 * 5; // Recently added/modified in last 5 mins
  };

  const exportToPDF = () => {
    const originalDisplay = document.body.style.display;
    window.print();
  };

  const exportToCSV = () => {
    const headers = ['Vendor', 'Date', 'Due Date', 'Total', 'Currency', 'Status', 'Tags'];
    const rows = filteredInvoices.map(inv => [
      `"${inv.vendorName.replace(/"/g, '""')}"`,
      inv.date,
      inv.dueDate,
      inv.total.toFixed(2),
      inv.currency,
      getDerivedStatus(inv.dueDate, inv.status),
      `"${inv.tags.join(', ')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="space-y-4 px-2">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Transactions</h3>
          <div className="flex gap-2">
            <button onClick={exportToPDF} className="text-[10px] font-black uppercase text-zinc-400 hover:text-blue-600 transition-colors bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-zinc-800">
              <i className="fas fa-file-pdf mr-1"></i> PDF
            </button>
            <button onClick={exportToCSV} className="text-[10px] font-black uppercase text-zinc-400 hover:text-blue-600 transition-colors bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-zinc-800">
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
          </div>
        </div>

        <div className="relative group">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-600 group-focus-within:text-blue-600 transition-colors"></i>
          <input 
            type="text" 
            placeholder="Search vendor, items or tags..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:border-blue-600 outline-none dark:text-white transition-all shadow-sm"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-print">
          {(['vendorName', 'date', 'dueDate', 'total', 'status'] as SortField[]).map(field => (
            <button 
              key={field} 
              onClick={() => handleSort(field)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${sortConfig.field === field ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black shadow-lg' : 'bg-white text-zinc-400 border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800'}`}
            >
              {field.replace(/([A-Z])/g, ' $1')} {sortConfig.field === field && (sortConfig.dir === 'asc' ? '↑' : '↓')}
            </button>
          ))}
        </div>

        {/* Bulk Action Toggle */}
        <div className="flex items-center gap-3 no-print">
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 dark:border-zinc-800'}`}>
              {selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0 && <i className="fas fa-check text-[10px]"></i>}
            </div>
            {selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0 ? 'Deselect Page' : 'Select Page'}
          </button>
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-3 relative pb-20">
        {paginatedInvoices.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-zinc-600 text-sm italic bg-gray-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
            No results match your search
          </div>
        ) : (
          paginatedInvoices.map((inv) => {
            const derivedStatus = getDerivedStatus(inv.dueDate, inv.status);
            const isOverdue = derivedStatus === 'OVERDUE';
            const isSoon = derivedStatus !== 'PAID' && isDueSoon(inv.dueDate);
            const isRecent = isRecentlyUpdated(inv.updatedAt);
            const isSelected = selectedIds.has(inv.id);
            
            return (
              <div 
                key={inv.id} 
                onClick={() => onEdit(inv)}
                className={`p-4 rounded-2xl flex items-center shadow-sm border transition-all cursor-pointer group relative ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200' : isOverdue ? 'bg-rose-50/30 dark:bg-rose-900/10 border-rose-300' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-blue-100'}`}
              >
                <div onClick={(e) => toggleSelectOne(inv.id, e)} className="mr-3 shrink-0 no-print">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 dark:border-zinc-800'}`}>
                    {isSelected && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                </div>

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 shrink-0 ${isOverdue ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'}`}>
                  <i className={`fas ${isOverdue ? 'fa-exclamation-circle' : 'fa-receipt'}`}></i>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{inv.vendorName}</p>
                    {isRecent && <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[7px] font-black uppercase">Recent</span>}
                    {isSoon && <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" title="Due Soon"></div>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {inv.tags.map(tag => (
                      <span key={tag} className="text-[7px] font-black uppercase bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-zinc-400">{tag}</span>
                    ))}
                    <span className="text-[8px] text-gray-400 dark:text-zinc-500 font-medium">Inv: {new Date(inv.date).toLocaleDateString()}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 rounded border ${derivedStatus === 'PAID' ? 'text-emerald-500 border-emerald-100' : derivedStatus === 'OVERDUE' ? 'text-rose-500 border-rose-100' : 'text-amber-500 border-amber-100'}`}>{derivedStatus}</span>
                  </div>
                </div>
                
                <div className="text-right ml-4 shrink-0">
                  <p className={`font-bold ${isOverdue ? 'text-rose-700 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>{formatMoney(inv.total, inv.currency)}</p>
                  <p className="text-[10px] text-gray-400">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })
        )}

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[35] w-[90%] max-w-sm animate-in fade-in slide-in-from-bottom-10 no-print">
            <div className="bg-zinc-900 dark:bg-zinc-950 rounded-2xl p-4 shadow-2xl border border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">{selectedIds.size}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Selected</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { onBulkMarkPaid(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors">Mark Paid</button>
                <button onClick={() => { onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 no-print">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)} 
            className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-zinc-400 disabled:opacity-30 hover:text-blue-600 transition-colors"
          >
            <i className="fas fa-arrow-left"></i> Previous
          </button>
          <span className="text-xs font-bold text-gray-400">{currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)} 
            className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-zinc-400 disabled:opacity-30 hover:text-blue-600 transition-colors"
          >
            Next <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default BillTable;
