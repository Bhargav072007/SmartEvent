import Foundation

struct GateLiveViewData: Identifiable, Codable, Equatable {
    var id: String { gate }
    let gate: String
    let count: Int
    let densityScore: Double
    let pressureScore: Double
    let flowSpeed: Double
    let flowDirection: String
    let waitMin: Double
    let status: String
    let predictedDensityLevel: String
    let recommendedAction: String
    let updatedAt: String

    init(
        gate: String,
        count: Int,
        densityScore: Double,
        pressureScore: Double,
        flowSpeed: Double,
        flowDirection: String,
        waitMin: Double,
        status: String,
        predictedDensityLevel: String,
        recommendedAction: String,
        updatedAt: String
    ) {
        self.gate = gate
        self.count = count
        self.densityScore = densityScore
        self.pressureScore = pressureScore
        self.flowSpeed = flowSpeed
        self.flowDirection = flowDirection
        self.waitMin = waitMin
        self.status = status
        self.predictedDensityLevel = predictedDensityLevel
        self.recommendedAction = recommendedAction
        self.updatedAt = updatedAt
    }
}

struct GateRecommendationResponse: Codable, Equatable {
    let recommendedGate: String
    let defaultGate: String
    let currentGate: String
    let rerouted: Bool
    let estimatedWaitMinutes: Double
    let walkDistanceMeters: Int
    let reason: String
    let expectedWaitReductionMinutes: Double
    let rankedGates: [RankedGate]
    let timestamp: String

    struct RankedGate: Codable, Equatable, Identifiable {
        var id: String { gate }
        let gate: String
        let projectedWaitMinutes: Double
        let projectedPressureScore: Double
        let status: String
    }
}

struct GatesLiveResponse: Codable {
    let gates: [String: GateLiveViewData]
    let timestamp: String
}

struct CrowdStatsResponse: Codable, Equatable {
    let totalPeopleDetected: Int
    let busiestGate: String
    let averageWaitMinutes: Double
    let maxPressureScore: Double
    let systemStatus: String
    let timestamp: String
}

struct CameraUpdateRequest: Encodable {
    let gate: String
    let personCount: Int
    let densityScore: Double
    let pressureScore: Double
    let flowSpeed: Double
    let flowDirection: String

    enum CodingKeys: String, CodingKey {
        case gate
        case personCount = "person_count"
        case densityScore = "density_score"
        case pressureScore = "pressure_score"
        case flowSpeed = "flow_speed"
        case flowDirection = "flow_direction"
    }
}

struct RecommendationRequestBody: Encodable {
    let fanType: String
    let currentGate: String?
    let seatSection: String?
    let matchID: String?
    let minutesFromKickoff: Int
    let kickoffBucket: String
    let weatherBucket: String
    let securityStrictness: String
    let premiumGameFlag: Bool
    let rivalryFlag: Bool
    let minImprovementMinutes: Double

    enum CodingKeys: String, CodingKey {
        case fanType = "fan_type"
        case currentGate = "current_gate"
        case seatSection = "seat_section"
        case matchID = "match_id"
        case minutesFromKickoff = "minutes_from_kickoff"
        case kickoffBucket = "kickoff_bucket"
        case weatherBucket = "weather_bucket"
        case securityStrictness = "security_strictness"
        case premiumGameFlag = "premium_game_flag"
        case rivalryFlag = "rivalry_flag"
        case minImprovementMinutes = "min_improvement_minutes"
    }
}
