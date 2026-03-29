import SwiftUI

struct SmartGateView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = SmartGateViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Smart Gate")
                        .font(.largeTitle.bold())
                    Text("Use live camera updates and face-pass verification to process gate entries.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Picker("Gate", selection: $viewModel.selectedGate) {
                    ForEach(["A", "B", "C", "D", "E", "F"], id: \.self) { gate in
                        Text("Gate \(gate)").tag(gate)
                    }
                }
                .pickerStyle(.segmented)

                VStack(spacing: 12) {
                    Image(systemName: viewModel.verificationState == .verified ? "person.crop.rectangle.badge.checkmark" : "camera.viewfinder")
                        .font(.system(size: 44))
                        .foregroundStyle(viewModel.verificationState == .verified ? .green : AppTheme.accent)
                    Text(viewModel.statusMessage)
                        .multilineTextAlignment(.center)
                    Button("Simulate Gate Verification") {
                        Task {
                            await viewModel.simulateVerification(appState: appState)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.accent)
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(.background)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))

                VStack(alignment: .leading, spacing: 8) {
                    Text("Throughput Log")
                        .font(.headline)
                    ForEach(viewModel.log, id: \.self) { item in
                        Text(item)
                            .font(.footnote)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(AppTheme.panel)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    if viewModel.log.isEmpty {
                        Text("No gate events yet.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Gate Control")
        .alert("Gate update failed", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }
}
