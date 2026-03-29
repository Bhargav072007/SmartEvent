import React, { createContext, useContext, useState } from 'react';

const TicketContext = createContext(null);

export function TicketProvider({ children }) {
  const [ticket, setTicket] = useState(() => {
    try {
      const saved = sessionStorage.getItem('smartevent_ticket');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const saveTicket = (t) => {
    setTicket(t);
    try { sessionStorage.setItem('smartevent_ticket', JSON.stringify(t)); } catch {}
  };

  const clearTicket = () => {
    setTicket(null);
    try { sessionStorage.removeItem('smartevent_ticket'); } catch {}
  };

  return (
    <TicketContext.Provider value={{ ticket, saveTicket, clearTicket }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTicket() {
  return useContext(TicketContext);
}