import Foundation

struct Ticket: Identifiable, Codable, Equatable {
    let id: UUID
    var holderName: String
    var eventName: String
    var date: String
    var section: String
    var row: String
    var seat: String
    var gate: String
    var parking: String

    static let demo = Ticket(
        id: UUID(),
        holderName: "Krishang Patel",
        eventName: "Penn State vs Akron",
        date: "Aug 30, 2025",
        section: "SA-12",
        row: "18",
        seat: "22",
        gate: "A",
        parking: "Lot A"
    )
}
