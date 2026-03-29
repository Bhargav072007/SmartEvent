# SmartEvent iOS Merge

This folder contains a native SwiftUI version of the attached SmartEvent web app, merged with the Beaver Stadium crowd-routing model.

## Included features

- Fan home screen with live gate status and reroute recommendation
- Smart Gate screen for gate verification / camera event simulation
- Ops dashboard with gate metrics and crowd stats
- Ticket and profile screens
- API service layer for the FastAPI crowd engine
- Clean architecture split into `Models`, `Services`, `ViewModels`, and `Views`

## Important

This is SwiftUI source code, not a prebuilt `.xcodeproj`.

You will create a new iOS app in Xcode and then drop these files into it.
