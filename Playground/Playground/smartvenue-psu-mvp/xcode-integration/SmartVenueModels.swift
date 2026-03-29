import Foundation

struct MockLoginRequest: Codable {
    let name: String
    let email: String
}

struct MockUser: Codable, Identifiable {
    let user_id: String
    let name: String
    let email: String

    var id: String { user_id }
}

struct UpcomingGame: Codable, Identifiable {
    let game_id: String
    let title: String
    let kickoff: String
    let venue: String

    var id: String { game_id }
}

struct Ticket: Codable, Identifiable {
    let ticket_id: String
    let user_id: String
    let seat: String
    let gate: String
    let token: String
    let scenario: String
    let status: String
    let issued_at: String
    let tap_started_at: String?
    let last_result: String?
    let last_gate: String

    var id: String { ticket_id }
}

struct TicketsResponse: Codable {
    let tickets: [Ticket]
}

struct IssueDemoRequest: Codable {
    let user_id: String
    let scenario: String
}

struct RecognitionHint: Codable {
    let ui_phase: String?
    let instruction: String?
    let confidence: Double?
}

struct TicketStatusResponse: Codable {
    let ticket_id: String
    let status: String
    let last_result: String?
    let last_gate: String
    let recognition_hint: RecognitionHint?
    let timestamp: String
}

enum DemoScenario: String, CaseIterable, Identifiable {
    case valid
    case used
    case expired
    case retry

    var id: String { rawValue }

    var title: String {
        switch self {
        case .valid: return "Valid pass"
        case .used: return "Already used"
        case .expired: return "Expired"
        case .retry: return "Retry"
        }
    }
}

