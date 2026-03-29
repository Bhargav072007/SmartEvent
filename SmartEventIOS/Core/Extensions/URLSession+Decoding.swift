import Foundation

extension URLSession {
    func decoded<T: Decodable>(_ request: URLRequest, as type: T.Type) async throws -> T {
        let (data, response) = try await data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw CrowdAPIError.invalidResponse
        }
        do {
            return try JSONDecoder.smartEventDecoder.decode(type, from: data)
        } catch {
            throw CrowdAPIError.decodingFailed(error)
        }
    }
}

extension JSONDecoder {
    static var smartEventDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
