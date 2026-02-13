
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export type InvoiceStatus = 'PAID' | 'UNPAID';

export interface CustomerProfile {
  id: string;
  name: string;
  totalSpent: number;
  invoiceCount: number;
  lastInvoiceDate: string;
}

export interface Invoice {
  id: string;
  vendorName: string;
  profileId?: string; // Linked profile
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  total: number;
  category: string;
  tags: string[]; // Added tags for categorization
  type: 'expense' | 'income';
  currency: string;
  status: InvoiceStatus;
  updatedAt: string; // Track modification time
}

export interface BalanceSheet {
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
}

export type ViewState = 'DASHBOARD' | 'SCANNING' | 'EDITING' | 'MANUAL_ENTRY';

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: 'Rs', name: 'Indian Rupee' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];
