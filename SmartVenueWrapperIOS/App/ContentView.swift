import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            WebContainerView(urlString: AppConfig.frontendURL)
                .ignoresSafeArea()
        }
    }
}

#Preview {
    ContentView()
}
