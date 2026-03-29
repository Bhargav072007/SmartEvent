import SwiftUI

struct OpsDashboardView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = OpsDashboardViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                header
                if let stats = viewModel.stats {
                    statsGrid(stats)
                }
                gateCards
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Ops Dashboard")
        .task {
            await viewModel.load(appState: appState)
        }
        .refreshable {
            await viewModel.load(appState: appState)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Beaver Stadium Live Ops")
                .font(.largeTitle.bold())
            Text("Monitor gate congestion, wait times, and system pressure from the crowd model.")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func statsGrid(_ stats: CrowdStatsResponse) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            metric("Total People", "\(stats.totalPeopleDetected)", "person.3.fill")
            metric("Busiest Gate", stats.busiestGate, "exclamationmark.triangle.fill")
            metric("Avg Wait", "\(stats.averageWaitMinutes, specifier: "%.1f")m", "clock.fill")
            metric("Max Pressure", "\(stats.maxPressureScore, specifier: "%.0f")", "chart.line.uptrend.xyaxis")
        }
    }

    private func metric(_ title: String, _ value: String, _ systemName: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: systemName)
                .foregroundStyle(AppTheme.accent)
            Text(value)
                .font(.title2.bold())
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var gateCards: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Gate Overview")
                .font(.headline)
            ForEach(viewModel.gates) { gate in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Gate \(gate.gate)")
                            .font(.headline)
                        Spacer()
                        Text(gate.status.capitalized)
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(AppTheme.panel)
                            .clipShape(Capsule())
                    }
                    HStack {
                        Label("\(gate.count) queue", systemImage: "person.3")
                        Spacer()
                        Label("\(gate.waitMin, specifier: "%.0f")m", systemImage: "clock")
                    }
                    .font(.subheadline)
                    Text("Action: \(gate.recommendedAction.replacingOccurrences(of: "_", with: " "))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(.background)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
        }
    }
}
