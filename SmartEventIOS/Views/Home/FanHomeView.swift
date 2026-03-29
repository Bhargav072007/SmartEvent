import SwiftUI

struct FanHomeView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = FanHomeViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                hero
                if let recommendation = viewModel.recommendation {
                    recommendationCard(recommendation)
                }
                if !viewModel.alerts.isEmpty {
                    alertsSection
                }
                gateList
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("SmartEvent PSU")
        .task {
            await viewModel.load(appState: appState)
        }
        .refreshable {
            await viewModel.load(appState: appState)
        }
        .alert("Something went wrong", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Welcome, \(appState.ticket.holderName)")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)
            Text("\(appState.ticket.eventName) • \(appState.ticket.date)")
                .foregroundStyle(.white.opacity(0.75))
            Text("Section \(appState.ticket.section) • Gate \(appState.ticket.gate)")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
            LinearGradient(colors: [AppTheme.navy, AppTheme.navy.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private func recommendationCard(_ recommendation: GateRecommendationResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("SmartVenue Recommendation", systemImage: "bolt.fill")
                .font(.headline)
                .foregroundStyle(AppTheme.accent)
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Use Gate \(recommendation.recommendedGate)")
                        .font(.title.bold())
                    Text(recommendation.reason)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(recommendation.estimatedWaitMinutes, specifier: "%.0f")m")
                        .font(.title.bold())
                    Text("estimated wait")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            if recommendation.rerouted {
                Text("You save about \(recommendation.expectedWaitReductionMinutes, specifier: "%.1f") minutes by switching.")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.green)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 16, y: 8)
    }

    private var alertsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Live Alerts")
                .font(.headline)
            ForEach(viewModel.alerts) { alert in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: alert.severity == .critical ? "exclamationmark.triangle.fill" : "bell.fill")
                        .foregroundStyle(alert.severity == .critical ? AppTheme.danger : AppTheme.warning)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(alert.title).font(.subheadline.bold())
                        Text(alert.message).font(.footnote).foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding()
                .background(AppTheme.panel)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
    }

    private var gateList: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Live Gate Status")
                .font(.headline)
            ForEach(viewModel.gates) { gate in
                GateRowView(gate: gate, isRecommended: gate.gate == viewModel.recommendation?.recommendedGate)
            }
        }
    }
}

private struct GateRowView: View {
    let gate: GateLiveViewData
    let isRecommended: Bool

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(colorForStatus)
                .frame(width: 10, height: 10)
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Gate \(gate.gate)")
                        .font(.headline)
                    if isRecommended {
                        Text("Recommended")
                            .font(.caption2.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(AppTheme.accent.opacity(0.15))
                            .foregroundStyle(AppTheme.accent)
                            .clipShape(Capsule())
                    }
                }
                Text(gate.recommendedAction.replacingOccurrences(of: "_", with: " "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing) {
                Text("\(gate.waitMin, specifier: "%.0f")m")
                    .font(.headline)
                Text("\(gate.count) in queue")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var colorForStatus: Color {
        switch gate.status.lowercased() {
        case "red": return AppTheme.danger
        case "amber": return AppTheme.warning
        default: return AppTheme.success
        }
    }
}
