import SwiftUI

@MainActor
final class AppState: ObservableObject {
    @Published var fanProfile: FanProfile
    @Published var ticket: Ticket
    @Published var settings: AppSettings

    init(
        fanProfile: FanProfile = .demo,
        ticket: Ticket = .demo,
        settings: AppSettings = .demo
    ) {
        self.fanProfile = fanProfile
        self.ticket = ticket
        self.settings = settings
    }
}
