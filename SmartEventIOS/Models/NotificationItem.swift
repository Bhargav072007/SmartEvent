import Foundation

struct NotificationItem: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let message: String
    let severity: Severity

    enum Severity {
        case info
        case warning
        case critical
    }
}
