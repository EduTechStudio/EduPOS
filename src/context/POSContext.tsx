import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, DiscountState } from '@/services/pos/POSService';
import { CustomerEntity } from '@/database/types';

interface POSContextProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  discount: DiscountState;
  setDiscount: React.Dispatch<React.SetStateAction<DiscountState>>;
  customer: CustomerEntity | null;
  setCustomer: React.Dispatch<React.SetStateAction<CustomerEntity | null>>;
  clearCart: () => void;
}

const POSContext = createContext<POSContextProps | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<DiscountState>({
    type: 'FIXED',
    value: 0,
    calculatedAmount: 0,
  });
  const [customer, setCustomer] = useState<CustomerEntity | null>(null);

  const clearCart = () => {
    setCart([]);
    setDiscount({
      type: 'FIXED',
      value: 0,
      calculatedAmount: 0,
    });
    setCustomer(null);
  };

  return (
    <POSContext.Provider value={{ cart, setCart, discount, setDiscount, customer, setCustomer, clearCart }}>
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
}
