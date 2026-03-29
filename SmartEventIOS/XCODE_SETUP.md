# SmartEvent iOS Setup Guide

## 1. What this is

The attached `SmartEvent-main.zip` was a React web app, not an iOS/Xcode app.

This folder contains the native SwiftUI replacement, already structured to connect with the Beaver Stadium crowd-routing backend.

Folder:

- `/Users/krishang/Documents/New project/SmartEventIOS`

## 2. File-by-file breakdown

### App

- `App/SmartEventCrowdApp.swift`
  App entry point.

- `App/AppState.swift`
  Shared app-level state: fan profile, ticket, API settings.

- `App/RootTabView.swift`
  Main tab navigation for Home, Smart Gate, Ops, Ticket, and Profile.

### Core

- `Core/Design/AppTheme.swift`
  Shared colors and design tokens.

- `Core/Extensions/URLSession+Decoding.swift`
  Shared networking decode helper.

### Models

- `Models/AppSettings.swift`
  Backend base URL and match/game settings.

- `Models/FanProfile.swift`
  Fan identity and verification state.

- `Models/Ticket.swift`
  Ticket and seating data.

- `Models/GateModels.swift`
  Live gate state, recommendation response, stats response, and API request payloads.

- `Models/NotificationItem.swift`
  Simple alert model for the home screen.

### Services

- `Services/CrowdRoutingAPI.swift`
  Real API client for the FastAPI backend.

- `Services/PreviewCrowdRoutingAPI.swift`
  Mock client you can switch to if backend is unavailable.

### ViewModels

- `ViewModels/FanHomeViewModel.swift`
  Loads live gates, recommendation, and alerts.

- `ViewModels/SmartGateViewModel.swift`
  Handles Smart Gate verification flow and camera update simulation.

- `ViewModels/OpsDashboardViewModel.swift`
  Loads operations metrics and live gate cards.

### Views

- `Views/Home/FanHomeView.swift`
  Main fan-facing screen.

- `Views/Gates/SmartGateView.swift`
  Smart Gate operations / face-pass demo flow.

- `Views/Ops/OpsDashboardView.swift`
  Operator dashboard.

- `Views/Ticket/TicketView.swift`
  Ticket details screen.

- `Views/Profile/ProfileView.swift`
  Profile and API settings display.

## 3. Exact steps to set up in Xcode

### Step A: Create a new iOS app

1. Open Xcode.
2. Click `Create a new project`.
3. Choose `iOS` -> `App`.
4. Click `Next`.
5. Product Name: `SmartEventCrowd`
6. Interface: `SwiftUI`
7. Language: `Swift`
8. Uncheck Core Data unless you want it.
9. Save it somewhere easy, for example Desktop or Documents.

### Step B: Remove starter files

Inside Xcode, you will see starter files like:

- `SmartEventCrowdApp.swift`
- `ContentView.swift`

Delete `ContentView.swift`.

Keep the app target and project itself.

### Step C: Add these Swift files

1. In Finder, open:
   `/Users/krishang/Documents/New project/SmartEventIOS`
2. Drag the folders `App`, `Core`, `Models`, `Services`, `ViewModels`, and `Views` into your Xcode project navigator.
3. When Xcode asks:
   - check `Copy items if needed`
   - check your app target
   - click `Finish`

### Step D: Replace the default app entry

If Xcode created its own app file, replace its contents with the code from:

- `/Users/krishang/Documents/New project/SmartEventIOS/App/SmartEventCrowdApp.swift`

### Step E: Build

Press:

- `Cmd + B`

If build succeeds, run with:

- `Cmd + R`

## 4. Backend requirements

The iOS app expects your crowd backend to be running locally.

Backend URL currently used:

- `http://127.0.0.1:8000`

Important:

- iPhone Simulator can usually access `127.0.0.1` on your Mac.
- A physical iPhone cannot use `127.0.0.1` for your Mac server.

If testing on a real device:

1. Find your Mac local IP address, like `192.168.1.25`
2. In `Models/AppSettings.swift`, change:
   - `apiBaseURL: "http://127.0.0.1:8000"`
   to
   - `apiBaseURL: "http://192.168.1.25:8000"`

## 5. Required installations

### For iOS app

No CocoaPods required.

No third-party Swift packages required for this version.

Everything is built with:

- SwiftUI
- Foundation
- URLSession

### For backend

You still need the Python backend running:

```bash
cd /Users/krishang/Documents/New\ project
python3 -m uvicorn smartvenue-cameraengine.engine.main:app --reload --app-dir /Users/krishang/Documents/New\ project
```

If needed, install backend packages:

```bash
python3 -m pip install fastapi uvicorn
```

## 6. Testing flow

### Test 1: Backend

Open in browser:

- `http://127.0.0.1:8000/docs`

If this loads, backend is alive.

### Test 2: iOS home screen

Run the iOS app in Simulator.

The Home tab should:

- load live gate cards
- show a recommendation
- show alerts if any gate is overloaded

### Test 3: Smart Gate tab

Tap `Simulate Gate Verification`.

This sends a camera-like gate update to the backend.

### Test 4: Ops tab

Pull down to refresh.

You should see:

- live gates
- total people
- average wait
- max pressure

## 7. Debugging tips

### If the app builds but shows no live data

Check:

1. Is the Python backend running?
2. Does `http://127.0.0.1:8000/docs` open?
3. Are you on Simulator or physical phone?
4. If on physical phone, change the API base URL to your Mac IP.

### If Xcode says “App Transport Security has blocked...”

Add this to your app `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

This is fine for hackathon/demo use.

### If JSON decoding fails

Usually this means:

- backend field names changed
- backend is returning an error page instead of JSON

Check Xcode console output and also test the same endpoint in the browser.

### If `127.0.0.1` works in Simulator but not on iPhone

That is expected.

Use your Mac LAN IP instead.

### If Smart Gate button fails

The `/api/camera/update` endpoint is not reachable.

Test it manually:

```bash
curl -X POST http://127.0.0.1:8000/api/camera/update \
  -H "Content-Type: application/json" \
  -d '{"gate":"A","person_count":320,"density_score":0.95,"pressure_score":0.92,"flow_speed":0.12,"flow_direction":"inbound"}'
```

## 8. Production-readiness notes

This structure is clean and production-friendly in architecture, but before App Store release you would still want:

- real authentication
- persistent storage for tickets and profile
- real camera/Face ID or backend verification flow
- stronger error states and retry UI
- analytics/logging
- environment configs for dev/staging/prod
- ATS-safe HTTPS backend instead of local HTTP
