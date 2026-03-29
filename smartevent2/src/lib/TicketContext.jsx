import React, { createContext, useContext, useState } from 'react';
import { registerTicketRecord } from './ticketRegistry';

const TicketContext = createContext(null);

export function TicketProvider({ children }) {
  const [ticket, setTicket] = useState(() => {
    try {
      const saved = sessionStorage.getItem('smartevent_ticket');
      return saved ? registerTicketRecord(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });

  const saveTicket = (t) => {
    const persisted = registerTicketRecord(t);
    setTicket(persisted);
    try { sessionStorage.setItem('smartevent_ticket', JSON.stringify(persisted)); } catch {}
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
