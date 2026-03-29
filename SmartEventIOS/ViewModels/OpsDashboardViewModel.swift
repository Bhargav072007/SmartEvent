import SwiftUI

@MainActor
final class OpsDashboardViewModel: ObservableObject {
    @Published var gates: [GateLiveViewData] = []
    @Published var stats: CrowdStatsResponse?
    @Published var errorMessage: String?
    @Published var isLoading = false

    private let api: CrowdRoutingAPIProtocol

    init(api: CrowdRoutingAPIProtocol = CrowdRoutingAPI()) {
        self.api = api
    }

    func load(appState: AppState) async {
        isLoading = true
        errorMessage = nil
        do {
            async let liveGates = api.fetchLiveGates(baseURL: appState.settings.apiBaseURL)
            async let liveStats = api.fetchStats(baseURL: appState.settings.apiBaseURL)
            gates = try await liveGates
            stats = try await liveStats
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
