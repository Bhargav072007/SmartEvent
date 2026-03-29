import Foundation

enum CrowdAPIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case decodingFailed(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The API base URL is invalid."
        case .invalidResponse:
            return "The server returned an invalid response."
        case .decodingFailed(let error):
            return "Failed to decode server data: \(error.localizedDescription)"
        }
    }
}

protocol CrowdRoutingAPIProtocol {
    func fetchLiveGates(baseURL: String) async throws -> [GateLiveViewData]
    func fetchStats(baseURL: String) async throws -> CrowdStatsResponse
    func fetchRecommendation(baseURL: String, request: RecommendationRequestBody) async throws -> GateRecommendationResponse
    func sendCameraUpdate(baseURL: String, request: CameraUpdateRequest) async throws
}

struct CrowdRoutingAPI: CrowdRoutingAPIProtocol {
    private let session: URLSession = .shared

    func fetchLiveGates(baseURL: String) async throws -> [GateLiveViewData] {
        let request = try makeRequest(baseURL: baseURL, path: "/api/gates/live")
        let response = try await session.decoded(request, as: GatesLiveResponse.self)
        return response.gates.values.sorted { $0.gate < $1.gate }
    }

    func fetchStats(baseURL: String) async throws -> CrowdStatsResponse {
        let request = try makeRequest(baseURL: baseURL, path: "/api/stats/live")
        return try await session.decoded(request, as: CrowdStatsResponse.self)
    }

    func fetchRecommendation(baseURL: String, request body: RecommendationRequestBody) async throws -> GateRecommendationResponse {
        var request = try makeRequest(baseURL: baseURL, path: "/api/gate/recommend", method: "POST")
        request.httpBody = try JSONEncoder().encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await session.decoded(request, as: GateRecommendationResponse.self)
    }

    func sendCameraUpdate(baseURL: String, request body: CameraUpdateRequest) async throws {
        var request = try makeRequest(baseURL: baseURL, path: "/api/camera/update", method: "POST")
        request.httpBody = try JSONEncoder().encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        _ = try await session.data(for: request)
    }

    private func makeRequest(baseURL: String, path: String, method: String = "GET") throws -> URLRequest {
        guard let url = URL(string: baseURL + path) else {
            throw CrowdAPIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        return request
    }
}
