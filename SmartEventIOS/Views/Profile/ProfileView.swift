import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        List {
            Section("Fan Profile") {
                detailRow("Name", appState.fanProfile.name)
                detailRow("Email", appState.fanProfile.email)
                detailRow("Fan Type", appState.fanProfile.fanType.capitalized)
                detailRow("Ticket Section", appState.fanProfile.ticketSection)
                detailRow("Assigned Gate", appState.fanProfile.assignedGate)
                detailRow("Parking", appState.fanProfile.parkingLot)
                detailRow("Verification", appState.fanProfile.verificationStatus.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
            }

            Section("API Settings") {
                detailRow("Base URL", appState.settings.apiBaseURL)
                detailRow("Match ID", appState.settings.matchID)
                detailRow("Weather", appState.settings.weatherBucket)
                detailRow("Security", appState.settings.securityStrictness)
            }
        }
        .navigationTitle("Profile")
    }

    private func detailRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.trailing)
        }
    }
}
