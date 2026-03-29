# SmartVenue Xcode Integration

These files are prepared so your teammate can drop them into the main Xcode app and connect the iOS UI to the current SmartVenue backend without rewriting the contract.

## What this package contains

- `SmartVenueModels.swift`
  - Codable models for the current backend responses
- `SmartVenueAPI.swift`
  - Async/await API client for the backend endpoints found in the USB backend
- `SmartVenueTheme.swift`
  - SwiftUI color and spacing tokens matching the SmartVenue UI direction
- `SmartVenueHomeViewModel.swift`
  - A lightweight observable view model that loads login, game, ticket, and ticket polling state

## Backend contract mapped

Base backend:
- `POST /auth/mock-login`
- `GET /games/upcoming`
- `GET /tickets/me?user_id=...`
- `POST /tickets/issue-demo`
- `GET /tickets/status/{ticket_id}`

Optional biometric enrollment service from the kiosk notes:
- `POST http://<laptop-ip>:5000/register`
- `GET http://<laptop-ip>:5050/recognition`

## How to use in Xcode

1. Copy these files into your Xcode project.
2. Set the backend base URL in `SmartVenueAPI.Configuration`.
3. Create a `@StateObject` of `SmartVenueHomeViewModel`.
4. Call:
   - `login(name:email:)`
   - `loadInitialData()`
   - `issueScenario(_:)`
   - `startPollingTicketStatus()`

## Suggested app structure

- `HomeView`
  - upcoming game card
  - status hints
- `FacePassView`
  - face-ready / registration / live status
- `TicketView`
  - ticket card
  - gate + seat
- `ResultView`
  - verified / denied outcome

## Important note

The kiosk Python UI and the Xcode iPhone app should both talk to the same backend, but they should remain separate frontends.

- Python kiosk UI = gate-side display
- Xcode app = fan-side mobile app
- backend = shared source of truth

