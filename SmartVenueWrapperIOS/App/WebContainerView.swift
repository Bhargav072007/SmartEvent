import SwiftUI
import WebKit
import CoreLocation
import UIKit

struct WebContainerView: UIViewRepresentable {
    let urlString: String

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "locationRequest")
        contentController.addUserScript(WKUserScript(source: Self.locationBridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: false))

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.allowsBackForwardNavigationGestures = false
        context.coordinator.attach(webView: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard let url = URL(string: urlString) else { return }
        if webView.url?.absoluteString != url.absoluteString {
            webView.load(URLRequest(url: url))
        }
    }

    private static let locationBridgeScript = """
    (function() {
      var callbacks = [];
      var lastLocation = null;

      window.__smartvenueNativeLocationDidUpdate = function(payload) {
        lastLocation = payload;
        callbacks.forEach(function(cb) {
          if (cb && cb.success) { cb.success(payload); }
        });
      };

      window.__smartvenueNativeLocationDidFail = function(message) {
        callbacks.forEach(function(cb) {
          if (cb && cb.error) {
            cb.error({ code: 1, message: message || 'Location denied' });
          }
        });
      };

      var geo = {
        getCurrentPosition: function(success, error) {
          if (lastLocation) {
            success(lastLocation);
            return;
          }
          callbacks.push({ success: success, error: error });
          try {
            window.webkit.messageHandlers.locationRequest.postMessage({ type: 'getCurrentPosition' });
          } catch (e) {
            if (error) { error({ code: 1, message: 'Native location bridge unavailable.' }); }
          }
        },
        watchPosition: function(success, error) {
          callbacks.push({ success: success, error: error });
          try {
            window.webkit.messageHandlers.locationRequest.postMessage({ type: 'watchPosition' });
          } catch (e) {
            if (error) { error({ code: 1, message: 'Native location bridge unavailable.' }); }
          }
          return callbacks.length;
        },
        clearWatch: function() {}
      };

      try {
        Object.defineProperty(navigator, 'geolocation', {
          value: geo,
          configurable: true
        });
      } catch (e) {
        navigator.geolocation = geo;
      }
    })();
    """

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {
        private let locationManager = CLLocationManager()
        private weak var webView: WKWebView?

        override init() {
            super.init()
            locationManager.delegate = self
            locationManager.desiredAccuracy = kCLLocationAccuracyBest
        }

        func attach(webView: WKWebView) {
            self.webView = webView
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "locationRequest" else { return }
            locationManager.requestWhenInUseAuthorization()
            locationManager.requestLocation()
        }

        func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                manager.requestLocation()
            } else if status == .denied || status == .restricted {
                sendLocationError("Location access denied on iPhone.")
            }
        }

        func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
            guard let location = locations.last else { return }
            let js = """
            window.__smartvenueNativeLocationDidUpdate({
              coords: {
                latitude: \(location.coordinate.latitude),
                longitude: \(location.coordinate.longitude),
                accuracy: \(location.horizontalAccuracy)
              },
              timestamp: Date.now()
            });
            """
            webView?.evaluateJavaScript(js, completionHandler: nil)
        }

        func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
            sendLocationError(error.localizedDescription)
        }

        private func sendLocationError(_ message: String) {
            let escaped = message.replacingOccurrences(of: "'", with: "\\'")
            let js = "window.__smartvenueNativeLocationDidFail('\(escaped)');"
            webView?.evaluateJavaScript(js, completionHandler: nil)
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url,
               shouldOpenExternally(url: url) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url {
                UIApplication.shared.open(url)
            }
            return nil
        }

        private func shouldOpenExternally(url: URL) -> Bool {
            guard let host = url.host else { return false }
            return host.contains("google.com") || host.contains("maps.apple.com")
        }
    }
}
