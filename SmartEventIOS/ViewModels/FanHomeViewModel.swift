import SwiftUI

@MainActor
final class FanHomeViewModel: ObservableObject {
    @Published var gates: [GateLiveViewData] = []
    @Published var recommendation: GateRecommendationResponse?
    @Published var stats: CrowdStatsResponse?
    @Published var alerts: [NotificationItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

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
            async let liveRecommendation = api.fetchRecommendation(
                baseURL: appState.settings.apiBaseURL,
                request: RecommendationRequestBody(
                    fanType: appState.fanProfile.fanType,
                    currentGate: appState.ticket.gate,
                    seatSection: appState.ticket.section,
                    matchID: appState.settings.matchID,
                    minutesFromKickoff: -20,
                    kickoffBucket: appState.settings.kickoffBucket,
                    weatherBucket: appState.settings.weatherBucket,
                    securityStrictness: appState.settings.securityStrictness,
                    premiumGameFlag: appState.settings.premiumGame,
                    rivalryFlag: appState.settings.rivalryGame,
                    minImprovementMinutes: 2.0
                )
            )

            gates = try await liveGates
            stats = try await liveStats
            recommendation = try await liveRecommendation
            alerts = makeAlerts(from: gates, recommendation: recommendation)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func makeAlerts(from gates: [GateLiveViewData], recommendation: GateRecommendationResponse?) -> [NotificationItem] {
        var output: [NotificationItem] = []
        if let recommendation, recommendation.rerouted {
            output.append(
                NotificationItem(
                    title: "Recommended Gate Updated",
                    message: recommendation.reason,
                    severity: .warning
                )
            )
        }
        output.append(
            contentsOf: gates.compactMap { gate in
                guard gate.status == "red" || gate.recommendedAction != "stay" else { return nil }
                return NotificationItem(
                    title: "Gate \(gate.gate) \(gate.status.capitalized)",
                    message: "Action: \(gate.recommendedAction.replacingOccurrences(of: "_", with: " "))",
                    severity: gate.status == "red" ? .critical : .warning
                )
            }
        )
        return output
    }
}
