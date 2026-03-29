import Foundation

@MainActor
final class SmartVenueHomeViewModel: ObservableObject {
    @Published var user: MockUser?
    @Published var game: UpcomingGame?
    @Published var tickets: [Ticket] = []
    @Published var activeTicket: Ticket?
    @Published var liveStatus: TicketStatusResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api: SmartVenueAPI
    private var pollingTask: Task<Void, Never>?

    init(api: SmartVenueAPI = SmartVenueAPI()) {
        self.api = api
    }

    func login(name: String, email: String) async {
        await runLoadingTask {
            self.user = try await api.mockLogin(name: name, email: email)
        }
    }

    func loadInitialData() async {
        guard let user else { return }
        await runLoadingTask {
            async let gameRequest = api.upcomingGame()
            async let ticketsRequest = api.tickets(for: user.user_id)
            let (game, tickets) = try await (gameRequest, ticketsRequest)
            self.game = game
            self.tickets = tickets
            self.activeTicket = tickets.first
        }
    }

    func issueScenario(_ scenario: DemoScenario) async {
        guard let user else { return }
        await runLoadingTask {
            let ticket = try await api.issueDemo(userID: user.user_id, scenario: scenario)
            self.activeTicket = ticket
            self.liveStatus = nil
        }
    }

    func startPollingTicketStatus() {
        guard let ticketID = activeTicket?.ticket_id else { return }
        pollingTask?.cancel()
        pollingTask = Task {
            while !Task.isCancelled {
                do {
                    let status = try await api.ticketStatus(ticketID: ticketID)
                    await MainActor.run {
                        self.liveStatus = status
                    }
                } catch {
                    await MainActor.run {
                        self.errorMessage = error.localizedDescription
                    }
                }
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    private func runLoadingTask(_ work: @escaping () async throws -> Void) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            try await work()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
