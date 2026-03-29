import Foundation

struct PreviewCrowdRoutingAPI: CrowdRoutingAPIProtocol {
    func fetchLiveGates(baseURL: String) async throws -> [GateLiveViewData] {
        [
            GateLiveViewData(gate: "A", count: 2186, densityScore: 0.95, pressureScore: 76.0, flowSpeed: 0.12, flowDirection: "inbound", waitMin: 17.6, status: "red", predictedDensityLevel: "critical", recommendedAction: "open_extra_lane", updatedAt: "now"),
            GateLiveViewData(gate: "B", count: 35, densityScore: 0.18, pressureScore: 9.8, flowSpeed: 0.62, flowDirection: "inbound", waitMin: 0, status: "green", predictedDensityLevel: "low", recommendedAction: "stay", updatedAt: "now"),
            GateLiveViewData(gate: "C", count: 70, densityScore: 0.28, pressureScore: 20.4, flowSpeed: 0.58, flowDirection: "inbound", waitMin: 0, status: "green", predictedDensityLevel: "low", recommendedAction: "stay", updatedAt: "now"),
            GateLiveViewData(gate: "D", count: 60, densityScore: 0.24, pressureScore: 17.7, flowSpeed: 0.56, flowDirection: "inbound", waitMin: 0, status: "green", predictedDensityLevel: "low", recommendedAction: "stay", updatedAt: "now"),
            GateLiveViewData(gate: "E", count: 110, densityScore: 0.52, pressureScore: 35.3, flowSpeed: 0.35, flowDirection: "inbound", waitMin: 1.5, status: "amber", predictedDensityLevel: "medium", recommendedAction: "deploy_staff", updatedAt: "now"),
            GateLiveViewData(gate: "F", count: 55, densityScore: 0.22, pressureScore: 18.2, flowSpeed: 0.60, flowDirection: "inbound", waitMin: 0, status: "green", predictedDensityLevel: "low", recommendedAction: "stay", updatedAt: "now")
        ]
    }

    func fetchStats(baseURL: String) async throws -> CrowdStatsResponse {
        CrowdStatsResponse(totalPeopleDetected: 2516, busiestGate: "A", averageWaitMinutes: 3.18, maxPressureScore: 76.0, systemStatus: "amber", timestamp: "now")
    }

    func fetchRecommendation(baseURL: String, request: RecommendationRequestBody) async throws -> GateRecommendationResponse {
        GateRecommendationResponse(
            recommendedGate: "C",
            defaultGate: "A",
            currentGate: request.currentGate ?? "A",
            rerouted: true,
            estimatedWaitMinutes: 0.0,
            walkDistanceMeters: 320,
            reason: "Reroute from A to C. The engine projects about 26.1 minutes less waiting with lower pressure at the alternate gate.",
            expectedWaitReductionMinutes: 26.1,
            rankedGates: [
                .init(gate: "C", projectedWaitMinutes: 0.0, projectedPressureScore: 20.4, status: "green"),
                .init(gate: "D", projectedWaitMinutes: 0.0, projectedPressureScore: 17.8, status: "green"),
                .init(gate: "B", projectedWaitMinutes: 0.0, projectedPressureScore: 9.8, status: "green"),
                .init(gate: "F", projectedWaitMinutes: 0.0, projectedPressureScore: 18.2, status: "green"),
                .init(gate: "E", projectedWaitMinutes: 1.5, projectedPressureScore: 35.3, status: "amber"),
                .init(gate: "A", projectedWaitMinutes: 26.1, projectedPressureScore: 96.3, status: "red")
            ],
            timestamp: "now"
        )
    }

    func sendCameraUpdate(baseURL: String, request: CameraUpdateRequest) async throws {}
}
