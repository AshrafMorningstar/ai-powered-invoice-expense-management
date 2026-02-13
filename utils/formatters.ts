
import { SUPPORTED_CURRENCIES } from '../types';

export const formatMoney = (amount: number, currencyCode: string = 'INR') => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;

  try {
    if (symbol === 'Rs') {
      return `Rs ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (e) {
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

export const getDerivedStatus = (dueDate: string, currentStatus: string): 'PAID' | 'UNPAID' | 'OVERDUE' => {
  if (currentStatus === 'PAID') return 'PAID';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return due < today ? 'OVERDUE' : 'UNPAID';
};

export const isDueSoon = (dueDate: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);
  threeDaysFromNow.setHours(23, 59, 59, 999);
  
  return due >= today && due <= threeDaysFromNow;
};
