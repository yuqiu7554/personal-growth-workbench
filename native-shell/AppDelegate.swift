import Cocoa
import WebKit

@main
final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!

    func applicationDidFinishLaunching(_ notification: Notification) {
        configureMenus()

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "个人成长工作台"
        window.minSize = NSSize(width: 1024, height: 680)
        window.contentView = webView
        window.center()
        window.setFrameAutosaveName("GrowthWorkbenchMainWindow")
        window.makeKeyAndOrderFront(nil)

        guard let resources = Bundle.main.resourceURL else {
            showLoadError("无法定位应用资源目录。")
            return
        }
        let frontend = resources.appendingPathComponent("workbench-prototype", isDirectory: true)
        let index = frontend.appendingPathComponent("index.html")
        webView.loadFileURL(index, allowingReadAccessTo: frontend)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if let url = navigationAction.request.url,
           let scheme = url.scheme,
           !["file", "about", "data"].contains(scheme) {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    private func configureMenus() {
        let mainMenu = NSMenu()
        let appItem = NSMenuItem()
        let editItem = NSMenuItem()
        mainMenu.addItem(appItem)
        mainMenu.addItem(editItem)

        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于个人成长工作台", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "退出个人成长工作台", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let editMenu = NSMenu(title: "编辑")
        editMenu.addItem(withTitle: "撤销", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "重做", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: "剪切", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "复制", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.title = "编辑"
        editItem.submenu = editMenu
        NSApp.mainMenu = mainMenu
    }

    private func showLoadError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "工作台加载失败"
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.runModal()
    }
}
