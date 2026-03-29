import Foundation

final class SmartVenueAPI {
    struct Configuration {
        let baseURL: URL

        static let local = Configuration(baseURL: URL(string: "http://127.0.0.1:8000")!)
    }

    enum APIError: Error {
        case invalidResponse
        case requestFailed(Int)
    }

    private let configuration: Configuration
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    init(configuration: Configuration = .local, session: URLSession = .shared) {
        self.configuration = configuration
        self.session = session
    }

    func mockLogin(name: String, email: String) async throws -> MockUser {
        try await request(
            path: "/auth/mock-login",
            method: "POST",
            body: MockLoginRequest(name: name, email: email),
            responseType: MockUser.self
        )
    }

    func upcomingGame() async throws -> UpcomingGame {
        try await request(
            path: "/games/upcoming",
            method: "GET",
            responseType: UpcomingGame.self
        )
    }

    func tickets(for userID: String) async throws -> [Ticket] {
        let response: TicketsResponse = try await request(
            path: "/tickets/me?user_id=\(userID.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? userID)",
            method: "GET",
            responseType: TicketsResponse.self
        )
        return response.tickets
    }

    func issueDemo(userID: String, scenario: DemoScenario) async throws -> Ticket {
        try await request(
            path: "/tickets/issue-demo",
            method: "POST",
            body: IssueDemoRequest(user_id: userID, scenario: scenario.rawValue),
            responseType: Ticket.self
        )
    }

    func ticketStatus(ticketID: String) async throws -> TicketStatusResponse {
        try await request(
            path: "/tickets/status/\(ticketID)",
            method: "GET",
            responseType: TicketStatusResponse.self
        )
    }

    private func request<Response: Decodable>(
        path: String,
        method: String,
        responseType: Response.Type
    ) async throws -> Response {
        try await request(path: path, method: method, body: Optional<Data>.none, responseType: responseType)
    }

    private func request<Body: Encodable, Response: Decodable>(
        path: String,
        method: String,
        body: Body,
        responseType: Response.Type
    ) async throws -> Response {
        let data = try encoder.encode(body)
        return try await request(path: path, method: method, body: data, responseType: responseType)
    }

    private func request<Response: Decodable>(
        path: String,
        method: String,
        body: Data?,
        responseType: Response.Type
    ) async throws -> Response {
        let url = configuration.baseURL.appending(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.requestFailed(http.statusCode)
        }
        return try decoder.decode(Response.self, from: data)
    }
}

