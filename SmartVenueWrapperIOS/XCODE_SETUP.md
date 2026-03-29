# SmartVenue iPhone Wrapper

Use this wrapper if you want to present the existing `smartevent2` web app on an iPhone through Xcode without changing the UI.

## 1. Keep the backend and frontend running on your Mac

Backend:

```bash
cd /Users/krishang/Documents/New\ project
python3 -m uvicorn smartvenue-cameraengine.engine.main:app --host 0.0.0.0 --port 8000 --app-dir /Users/krishang/Documents/New\ project
```

Frontend:

```bash
cd /Users/krishang/Documents/New\ project/smartevent2
npm run dev -- --host 0.0.0.0 --port 5173
```

## 2. Find your Mac IP

```bash
ipconfig getifaddr en0
```

If that returns nothing:

```bash
ipconfig getifaddr en1
```

You should get something like `192.168.1.25`.

## 3. Create a new Xcode app

In Xcode:

1. Create a new iOS app.
2. Choose `SwiftUI`.
3. Name it `SmartVenueWrapper`.
4. Save it anywhere you want.

## 4. Replace the default files

Delete the default generated app/view files inside the new Xcode project.

Then drag these files into Xcode:

- `/Users/krishang/Documents/New project/SmartVenueWrapperIOS/App/SmartVenueWrapperApp.swift`
- `/Users/krishang/Documents/New project/SmartVenueWrapperIOS/App/ContentView.swift`
- `/Users/krishang/Documents/New project/SmartVenueWrapperIOS/App/AppConfig.swift`
- `/Users/krishang/Documents/New project/SmartVenueWrapperIOS/App/WebContainerView.swift`

When asked, make sure they are added to your app target.

## 5. Set the frontend URL

Open:

- `/Users/krishang/Documents/New project/SmartVenueWrapperIOS/App/AppConfig.swift`

Change:

```swift
static let frontendURL = "http://127.0.0.1:5173"
```

to your Mac IP:

```swift
static let frontendURL = "http://192.168.1.25:5173"
```

Use your real IP, not this example.

## 6. Allow HTTP for the hackathon demo

In Xcode:

1. Click your app target.
2. Open the `Info` tab.
3. Under `Custom iOS Target Properties`, add:

- `App Transport Security Settings`
  - `Allow Arbitrary Loads` = `YES`

## 7. Allow location access

Still in the `Info` tab, add:

- `Privacy - Location When In Use Usage Description`

Value:

`SmartVenue uses your location to recommend the fastest stadium gate.`

Also add these so image upload works correctly on iPhone:

- `Privacy - Camera Usage Description`
- `Privacy - Photo Library Usage Description`

Suggested values:

- `SmartVenue uses the camera for Face Pass and gate verification photos.`
- `SmartVenue uses your photo library so you can upload a selfie or ticket image.`

## 8. Run on your iPhone

Make sure:

- your iPhone and Mac are on the same Wi‑Fi
- backend is running
- frontend is running
- `frontendURL` uses your Mac IP

Then press `Run` in Xcode.

If location still says denied:

1. Delete the app from your iPhone.
2. Run it again from Xcode.
3. When iPhone asks for location access, press `Allow While Using App`.

If selfie upload was closing the app before:

1. Add the camera and photo-library permissions above.
2. Delete the app from your iPhone.
3. Reinstall from Xcode.
4. On the first upload, choose `Photo Library` first to confirm the picker works.

The wrapper now injects native iPhone location into the web app, so it should behave like a real mobile app instead of browser `http` geolocation.

If `Open in Google Maps` does nothing:

- install Google Maps on the phone, or
- iOS will fall back to opening the URL externally in the browser

The wrapper now handles external map links outside the web view.

## 9. Kiosk screen on another device

For your gate verification demo, open this on another phone, tablet, or laptop:

`http://YOUR_MAC_IP:5173/gate-verify`

That gives you:

- iPhone user app
- separate kiosk/gate scanner screen

using the same live backend.
