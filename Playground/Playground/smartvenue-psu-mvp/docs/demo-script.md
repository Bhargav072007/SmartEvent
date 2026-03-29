# Demo Script

## Setup

1. Start backend on your laptop or Raspberry Pi.
2. Start the Pi gate service with `GATE_ID=Gate A`.
3. Launch the mobile app in Expo.

## Best demo order

### 1. Opening story

- “SmartVenue PSU gives Beaver Stadium a DigiYatra-style tap-and-go experience.”
- “The fan keeps a wallet-style pass inside the app.”
- “The gate device is a Raspberry Pi with an NFC reader and SenseCAP display.”

### 2. Happy path

- Sign in on the mobile app.
- Show the Penn State vs Michigan wallet pass.
- Tap or simulate the token `PSU-VALID-001`.
- Pi shows `VERIFIED`.
- App updates to `Entry Verified`.

### 3. Failure path

- Enter `PSU-USED-001`.
- Pi shows `ALREADY USED`.
- App moves to failure state with retry/help messaging.

### 4. Ticket friction path

- Enter `PSU-EXPIRED-001`.
- Show that invalid timing is blocked.

### 5. Retry path

- Enter `PSU-RETRY-001`.
- Show how the system handles malformed or unreadable input without crashing.

## Judge talking points

- Clear hardware-software loop
- Believable gate device architecture
- Fan app and gate device stay in sync
- Demo-friendly seeded scenarios
- Clean upgrade path from mock reader to real NFC hardware
