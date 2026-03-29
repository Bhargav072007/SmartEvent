import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                FanHomeView()
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }

            NavigationStack {
                SmartGateView()
            }
            .tabItem {
                Label("Smart Gate", systemImage: "person.crop.rectangle.badge.checkmark")
            }

            NavigationStack {
                OpsDashboardView()
            }
            .tabItem {
                Label("Ops", systemImage: "waveform.path.ecg.rectangle")
            }

            NavigationStack {
                TicketView()
            }
            .tabItem {
                Label("Ticket", systemImage: "ticket.fill")
            }

            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Label("Profile", systemImage: "person.crop.circle")
            }
        }
        .tint(AppTheme.accent)
    }
}
