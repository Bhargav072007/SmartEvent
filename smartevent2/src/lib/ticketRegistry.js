const STORAGE_KEY = 'smartevent_ticket_registry';

const readRegistry = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeRegistry = (registry) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
};

export const createUniqueTicketCode = () => {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SV-${datePart}-${randomPart}`;
};

export const buildTicketQRPayload = (ticket) => JSON.stringify({
  type: 'smartevent-ticket',
  version: 1,
  code: ticket.code,
  holderName: ticket.holderName,
  email: ticket.email || '',
  eventName: ticket.eventName,
  gate: ticket.gate,
  section: ticket.section,
  row: ticket.row,
  seat: ticket.seat,
  parking: ticket.parking || '',
});

export const registerTicketRecord = (ticket) => {
  const code = ticket.code || createUniqueTicketCode();
  const record = {
    ...ticket,
    code,
    updatedAt: new Date().toISOString(),
  };

  const registry = readRegistry();
  registry[code] = record;
  writeRegistry(registry);
  return record;
};

export const findTicketRecord = (code) => {
  if (!code) return null;
  const registry = readRegistry();
  return registry[String(code).trim().toUpperCase()] || null;
};

export const listTicketRecords = () => Object.values(readRegistry());

export const parseTicketQRPayload = (rawValue) => {
  if (!rawValue) return null;

  const trimmed = String(rawValue).trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.type === 'smartevent-ticket' && parsed?.code) {
      return { code: String(parsed.code).trim().toUpperCase(), payload: parsed };
    }
  } catch {}

  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('ticketCode') || url.searchParams.get('code');
    if (code) {
      return { code: String(code).trim().toUpperCase(), payload: null };
    }
  } catch {}

  if (/^[A-Z0-9-]{4,}$/.test(trimmed.toUpperCase())) {
    return { code: trimmed.toUpperCase(), payload: null };
  }

  return null;
};

export const seedTicketRecords = (tickets) => {
  tickets.forEach((ticket) => {
    registerTicketRecord(ticket);
  });
};
