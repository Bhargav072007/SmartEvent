import SwiftUI

struct TicketView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        List {
            Section("Ticket") {
                detailRow("Holder", appState.ticket.holderName)
                detailRow("Event", appState.ticket.eventName)
                detailRow("Date", appState.ticket.date)
                detailRow("Section", appState.ticket.section)
                detailRow("Row", appState.ticket.row)
                detailRow("Seat", appState.ticket.seat)
                detailRow("Default Gate", appState.ticket.gate)
                detailRow("Parking", appState.ticket.parking)
            }
        }
        .navigationTitle("My Ticket")
    }

    private func detailRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(value).foregroundStyle(.secondary)
        }
    }
}
