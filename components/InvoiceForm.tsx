
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem, SUPPORTED_CURRENCIES, InvoiceStatus, CustomerProfile } from '../types';
import { formatMoney } from '../utils/formatters';

interface InvoiceFormProps {
  initialData?: Partial<Invoice>;
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
  isLoading?: boolean;
  profiles: CustomerProfile[];
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialData, onSave, onCancel, isLoading, profiles }) => {
  const [vendorName, setVendorName] = useState(initialData?.vendorName || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState(initialData?.currency || 'INR');
  const [status, setStatus] = useState<InvoiceStatus>(initialData?.status || 'UNPAID');
  const [category, setCategory] = useState(initialData?.category || 'General');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>(
    initialData?.items || [{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 }]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData?.items) setItems(initialData.items);
    if (initialData?.vendorName) setVendorName(initialData.vendorName);
    if (initialData?.tags) setTags(initialData.tags);
    if (initialData?.category) setCategory(initialData.category);
  }, [initialData]);

  const matchedProfile = useMemo(() => {
    return profiles.find(p => p.name.toLowerCase() === vendorName.trim().toLowerCase());
  }, [vendorName, profiles]);

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 }]);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    if (errors.items) {
      const newErrors = { ...errors };
      delete newErrors.items;
      setErrors(newErrors);
    }
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!vendorName.trim()) newErrors.vendorName = "Vendor name is required.";
    if (!date) newErrors.date = "Invoice date is required.";
    if (!dueDate) newErrors.dueDate = "Due date is required.";
    
    const hasInvalidItems = items.some(item => 
      !item.description.trim() || item.quantity <= 0 || item.rate < 0
    );
    if (hasInvalidItems) newErrors.items = "Validate item details (description, qty > 0, rate >= 0).";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const invoice: Invoice = {
      id: initialData?.id || crypto.randomUUID(),
      vendorName: vendorName.trim(),
      date,
      dueDate,
      items,
      total: calculateTotal(),
      category,
      tags,
      type: 'expense',
      currency,
      status,
      updatedAt: new Date().toISOString()
    };
    onSave(invoice);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black z-[60] flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
        <div className="relative mb-10">
          <div className="w-24 h-24 border-8 border-blue-600/10 rounded-full"></div>
          <div className="w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <i className="fas fa-robot text-2xl text-blue-600 dark:text-blue-400 animate-pulse"></i>
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">AI Analysis</h2>
        <p className="text-gray-400 dark:text-zinc-500 max-w-xs font-medium">Extracting vendor, dates, and line items...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-black z-[60] overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 pb-40">
        <div className="flex justify-between items-center mb-10 sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl pt-4 pb-6 z-10 border-b border-gray-50 dark:border-zinc-900">
          <button onClick={onCancel} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-2xl transition-all">
            <i className="fas fa-chevron-left"></i>
          </button>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Verify Entry</h2>
          <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20">Save</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="col-span-2">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Vendor Name</label>
              {matchedProfile && <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Existing Profile</span>}
            </div>
            <input 
              type="text" 
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className={`w-full border-2 rounded-3xl p-5 font-bold outline-none transition-all dark:bg-zinc-900 dark:text-white ${errors.vendorName ? 'border-rose-500' : 'border-gray-50 dark:border-zinc-800 focus:border-blue-600'}`}
              placeholder="Vendor Name"
            />
            {errors.vendorName && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-4">{errors.vendorName}</p>}
          </section>

          <section className="col-span-2">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Tags (Press Enter)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span key={tag} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-rose-500 transition-colors"><i className="fas fa-times"></i></button>
                </span>
              ))}
            </div>
            <input 
              type="text" 
              value={newTag}
              onKeyDown={addTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="w-full border-2 border-gray-50 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-4 font-bold text-gray-900 dark:text-white focus:border-blue-600 outline-none"
              placeholder="Utilities, Rent, Personal..."
            />
          </section>

          <section>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Invoice Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border-2 border-gray-50 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 rounded-3xl p-5 font-bold text-gray-900 dark:text-white outline-none"/>
          </section>

          <section>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border-2 border-gray-50 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 rounded-3xl p-5 font-bold text-gray-900 dark:text-white outline-none"/>
          </section>

          <section className="col-span-2">
            <div className="flex justify-between items-center mb-5">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Line Items</label>
              <button onClick={addItem} className="text-blue-600 text-xs font-black hover:opacity-70">+ Add Item</button>
            </div>
            {errors.items && <p className="text-rose-500 text-[10px] font-bold mb-4">{errors.items}</p>}
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="p-6 bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl relative border border-transparent hover:border-blue-100 transition-all">
                  <button onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-zinc-800 rounded-full shadow-lg text-gray-300 hover:text-rose-500 transition-all flex items-center justify-center"><i className="fas fa-times"></i></button>
                  <input 
                    type="text" 
                    value={item.description} 
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                    className="w-full bg-transparent font-black text-lg mb-4 border-b border-zinc-200 dark:border-zinc-800 outline-none focus:border-blue-600 text-gray-900 dark:text-white" 
                    placeholder="Description"
                  />
                  <div className="flex gap-6">
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Qty</label>
                      <input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-zinc-900 p-3 rounded-xl text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-blue-600"/>
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Rate</label>
                      <input type="number" min="0" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-zinc-900 p-3 rounded-xl text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-blue-600"/>
                    </div>
                    <div className="flex-1 text-right self-end">
                      <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Total</p>
                      <p className="font-black text-blue-600 text-lg">{(item.quantity * item.rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
