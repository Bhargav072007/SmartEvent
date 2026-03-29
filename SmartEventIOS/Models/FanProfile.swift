import Foundation

struct FanProfile: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var email: String
    var fanType: String
    var ticketSection: String
    var assignedGate: String
    var verificationStatus: VerificationStatus
    var parkingLot: String
    var checkedIn: Bool

    enum VerificationStatus: String, Codable, CaseIterable {
        case pending
        case verified
        case retry
        case manualCheck = "manual_check"
    }

    static let demo = FanProfile(
        id: UUID(),
        name: "Krishang Patel",
        email: "krishang@example.com",
        fanType: "student",
        ticketSection: "SA-12",
        assignedGate: "A",
        verificationStatus: .verified,
        parkingLot: "Lot A",
        checkedIn: false
    )
}
