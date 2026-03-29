import SwiftUI

@MainActor
final class SmartGateViewModel: ObservableObject {
    enum VerificationState: String {
        case idle
        case analyzing
        case verified
        case manualReview
    }

    @Published var selectedGate: String = "A"
    @Published var verificationState: VerificationState = .idle
    @Published var statusMessage: String = "Ready for Smart Gate check-in"
    @Published var log: [String] = []
    @Published var errorMessage: String?

    private let api: CrowdRoutingAPIProtocol

    init(api: CrowdRoutingAPIProtocol = CrowdRoutingAPI()) {
        self.api = api
    }

    func simulateVerification(appState: AppState) async {
        verificationState = .analyzing
        statusMessage = "Sending gate update and verifying entry..."
        errorMessage = nil

        do {
            try await api.sendCameraUpdate(
                baseURL: appState.settings.apiBaseURL,
                request: CameraUpdateRequest(
                    gate: selectedGate,
                    personCount: selectedGate == "A" ? 320 : 65,
                    densityScore: selectedGate == "A" ? 0.95 : 0.26,
                    pressureScore: selectedGate == "A" ? 0.92 : 0.18,
                    flowSpeed: selectedGate == "A" ? 0.12 : 0.58,
                    flowDirection: "inbound"
                )
            )
            verificationState = .verified
            statusMessage = "Face pass verified. Gate \(selectedGate) can proceed."
            log.insert("\(Date().formatted(date: .omitted, time: .standard)) Verified at Gate \(selectedGate)", at: 0)
        } catch {
            verificationState = .manualReview
            statusMessage = "Verification failed. Route to manual review."
            errorMessage = error.localizedDescription
            log.insert("\(Date().formatted(date: .omitted, time: .standard)) Manual review at Gate \(selectedGate)", at: 0)
        }
    }
}
