const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  mockLogin(payload) {
    return request("/auth/mock-login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  upcomingGame() {
    return request("/games/upcoming");
  },
  myTickets(userId) {
    return request(`/tickets/me?user_id=${encodeURIComponent(userId)}`);
  },
  issueDemo(payload) {
    return request("/tickets/issue-demo", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  ticketStatus(ticketId) {
    return request(`/tickets/status/${ticketId}`);
  },
};
