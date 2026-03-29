import Foundation

struct AppSettings: Equatable {
    var apiBaseURL: String
    var matchID: String
    var kickoffBucket: String
    var weatherBucket: String
    var securityStrictness: String
    var premiumGame: Bool
    var rivalryGame: Bool

    static let demo = AppSettings(
        apiBaseURL: "http://127.0.0.1:8000",
        matchID: "bsu_2025_001",
        kickoffBucket: "noon",
        weatherBucket: "clear",
        securityStrictness: "elevated",
        premiumGame: true,
        rivalryGame: false
    )
}
