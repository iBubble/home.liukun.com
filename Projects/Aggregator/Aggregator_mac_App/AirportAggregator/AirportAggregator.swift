
import SwiftUI
import AppKit

// MARK: - Models

enum AppState: Equatable {
    case idle
    case fetching
    case validating
    case saving
    case completed
    case error(String)
}

struct YamlFile: Identifiable {
    let id = UUID()
    let name: String
    let path: String
    let date: Date
    let proxyCount: Int
}

class AggregatorModel: ObservableObject {
    @Published var output = ""
    @Published var isRunning = false
    @Published var appState: AppState = .idle
    @Published var progress: Double = 0.0
    @Published var statusMessage: String = "准备就绪"
    
    // Stats
    @Published var totalCount: Int = 0
    @Published var validCount: Int = 0
    @Published var sourceCount: Int = 0
    @Published var diffMessage: String = ""
    
    // Config
    @Published var threadCount: Double = 64
    
    // State
    @Published var currentRunMode: RunMode? = nil
    
    // Files
    @Published var yamlFiles: [YamlFile] = []
    
    private var process: Process?
    
    // Paths
    private var aggregatorDir: String {
        if let resourcePath = Bundle.main.resourcePath {
            let bundledPath = resourcePath + "/external/aggregator"
            var isDir: ObjCBool = false
            if FileManager.default.fileExists(atPath: bundledPath, isDirectory: &isDir), isDir.boolValue {
                return bundledPath
            }
        }
        return "/Users/gemini/Projects/Own/Antigravity/Aggregator/external/aggregator"
    }
    
    private var yamlsDir: String {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let dir = home.appendingPathComponent("Documents/AntigravityAggregator/Yamls")
        return dir.path
    }
    
    private var pythonPath: String {
        return "/usr/bin/python3"
    }
    
    init() {
        refreshYamlList()
    }
    
    // MARK: - Actions
    
    enum RunMode {
        case crawl   // 全网抓取 (Two-step)
        case refresh // 仅验证 (Refresh)
    }

    func startTask(mode: RunMode) {
        guard !isRunning else { return }
        
        resetState()
        currentRunMode = mode
        isRunning = true
        
        switch mode {
        case .crawl:
            runCrawlStep1()
        case .refresh:
            runRefreshStep()
        }
    }
    
    func deleteYaml(_ file: YamlFile) {
        try? FileManager.default.removeItem(atPath: file.path)
        refreshYamlList()
    }
    
    // MARK: - Pipeline Steps
    
    private func runCrawlStep1() {
        appState = .fetching
        statusMessage = "第一步: 正在全网搜集候选节点 (不生成最终文件)..."
        progress = 0.05
        
        // Backup existing valid clash.yaml so we don't expose dirty data or lose if fail
        backupCurrentConfig()
        
        let args = ["subscribe/collect.py", "--overwrite", "--skip", "-n", String(Int(threadCount))]
        
        executeScript(args: args) { [weak self] success in
            guard success else {
                self?.restoreBackupConfig()
                self?.finish(success: false, message: "搜集失败")
                return
            }
            
            // Rename the result (dirty candidates) to candidates.yaml
            self?.saveCandidatesFile()
            
            // Proceed to Step 2
            self?.runCrawlStep2()
        }
    }
    
    private func runCrawlStep2() {
        appState = .validating
        statusMessage = "第二步: 正在验证并生成最终订阅..."
        progress = 0.5
        
        // Prepare clash.yaml with candidates for checking
        prepareForValidation()
        
        // Run refresh/validate
        // Note: --refresh checks existing subscriptions in the file
        let args = ["subscribe/collect.py", "--overwrite", "--refresh", "-n", String(Int(threadCount))]
        
        executeScript(args: args) { [weak self] success in
             // Whether success or not, we reached end.
             // If success, clash.yaml is now Clean.
             self?.finish(success: success, message: success ? "处理完成" : "验证失败")
        }
    }
    
    private func runRefreshStep() {
        appState = .validating
        statusMessage = "正在验证现有节点..."
        progress = 0.1
        
        let args = ["subscribe/collect.py", "--overwrite", "--refresh", "-n", String(Int(threadCount))]
        
        executeScript(args: args) { [weak self] success in
            self?.finish(success: success, message: success ? "验证完成" : "验证失败")
        }
    }
    
    // MARK: - Process Management
    
    private func executeScript(args: [String], completion: @escaping (Bool) -> Void) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: pythonPath)
        task.currentDirectoryURL = URL(fileURLWithPath: aggregatorDir)
        
        var env = ProcessInfo.processInfo.environment
        env["PYTHONPATH"] = aggregatorDir
        env["PYTHONUNBUFFERED"] = "1"
        task.environment = env
        
        task.arguments = args
        
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe
        
        task.terminationHandler = { [weak self] _ in
            let status = task.terminationStatus
            DispatchQueue.main.async {
                self?.process = nil
                completion(status == 0)
            }
        }
        
        do {
            try task.run()
            process = task
            
            let handle = pipe.fileHandleForReading
            handle.readabilityHandler = { [weak self] pipe in
                if let data = try? pipe.read(upToCount: 1024), let line = String(data: data, encoding: .utf8) {
                    DispatchQueue.main.async {
                        self?.parseOutput(line)
                    }
                }
            }
        } catch {
            DispatchQueue.main.async {
                self.appState = .error(error.localizedDescription)
                self.statusMessage = "启动失败: \(error.localizedDescription)"
                completion(false)
            }
        }
    }
    
    private func finish(success: Bool, message: String) {
        isRunning = false
        currentRunMode = nil
        if success {
            appState = .completed
            statusMessage = message
            progress = 1.0
            postProcess()
        } else {
            appState = .error(message)
            statusMessage = message
        }
    }
    
    func stopTask() {
        guard isRunning, let process = process else { return }
        process.terminate()
        self.process = nil
        
        DispatchQueue.main.async {
            self.isRunning = false
            self.currentRunMode = nil
            self.appState = .idle
            self.statusMessage = "任务已中断"
        }
    }
    
    func refreshYamlList() {
        let fileManager = FileManager.default
        
        // Ensure yamlsDir exists
        if !fileManager.fileExists(atPath: yamlsDir) {
            do {
                try fileManager.createDirectory(atPath: yamlsDir, withIntermediateDirectories: true, attributes: nil)
            } catch {
                print("Error creating yamls directory: \(error)")
                return
            }
        }
        
        guard let files = try? fileManager.contentsOfDirectory(atPath: yamlsDir) else { return }
        
        var list: [YamlFile] = []
        for file in files where file.hasSuffix(".yaml") {
            let fullPath = yamlsDir + "/" + file
            if let attr = try? fileManager.attributesOfItem(atPath: fullPath),
               let date = attr[.creationDate] as? Date {
                
                // Estimate count by reading lines containing "name:"
                // strict yaml parsing is too heavy for main thread, do simple estimation
                let content = (try? String(contentsOfFile: fullPath, encoding: .utf8)) ?? ""
                let count = content.components(separatedBy: "name:").count - 1
                
                list.append(YamlFile(name: file, path: fullPath, date: date, proxyCount: max(0, count)))
            }
        }
        
        DispatchQueue.main.async {
            self.yamlFiles = list.sorted(by: { $0.date > $1.date })
            // Update sidebar stats with the latest file
            if let latest = self.yamlFiles.first {
                self.validCount = latest.proxyCount
                self.diffMessage = "" // Reset diff message when refreshing list manually
            } else {
                self.validCount = 0
                self.diffMessage = ""
            }
        }
    }
    
    func openClash() {
        NSWorkspace.shared.openApplication(at: URL(fileURLWithPath: "/Applications/Clash Verge.app"), configuration: NSWorkspace.OpenConfiguration(), completionHandler: nil)
    }
    
    // MARK: - Internals
    
    private func resetState() {
        output = ""
        progress = 0
        totalCount = 0
        validCount = 0
        sourceCount = 0
        diffMessage = ""
    }
    
    private func parseOutput(_ text: String) {
        if output.count > 20000 {
            output = String(output.suffix(10000))
        }
        // Handle Carrige Return used by progress bars: split line and take last? 
        // For now, raw append allows user to see "movement", even if messy.
        output += text
        
        let lower = text.lowercased()
        
        // Progress parsing
        if lower.contains("start collect") {
            appState = .fetching
            statusMessage = "正在全网搜寻..."
            withAnimation { if progress < 0.3 { progress += 0.05 } }
        } else if lower.contains("checking") || lower.contains("validating") {
            appState = .validating
            statusMessage = "正在验证连通性..."
            withAnimation { if progress < 0.4 { progress = 0.4 } }
        } else if lower.contains("saving") {
            appState = .saving
            statusMessage = "正在保存..."
            withAnimation { progress = 0.95 }
        }
        
        // Count parsing
        
        // 1. Domains (Sources) - Accumulative
        if let range = lower.range(of: "found \\d+ domains", options: .regularExpression) {
             let match = String(lower[range]).components(separatedBy: " ").filter({ Int($0) != nil }).first
             if let c = match, let val = Int(c) {
                 sourceCount += val
             }
        }
        
        // 2. Proxies/Candidates (Nodes) - Absolute/Summary
        if let range = lower.range(of: "found \\d+ (proxies|candidates)", options: .regularExpression) {
             let match = String(lower[range]).components(separatedBy: " ").filter({ Int($0) != nil }).first
             if let c = match, let val = Int(c) {
                 totalCount = val
             }
        }
        
        // 3. Valid Nodes - Incremental
        if text.contains("has been added") {
            validCount += 1
            // Estimate progress for validation
            withAnimation {
                if progress < 0.9 { progress += 0.01 }
            }
        }
    }
    
    // MARK: - File Helpers
    
    private func backupCurrentConfig() {
        let fm = FileManager.default
        let src = aggregatorDir + "/data/clash.yaml"
        let bak = aggregatorDir + "/data/clash.yaml.keep"
        if fm.fileExists(atPath: src) {
            try? fm.removeItem(atPath: bak)
            try? fm.moveItem(atPath: src, toPath: bak)
        }
    }
    
    private func restoreBackupConfig() {
        let fm = FileManager.default
        let src = aggregatorDir + "/data/clash.yaml"
        let bak = aggregatorDir + "/data/clash.yaml.keep"
        if fm.fileExists(atPath: bak) {
            try? fm.removeItem(atPath: src)
            try? fm.moveItem(atPath: bak, toPath: src)
        }
    }
    
    private func saveCandidatesFile() {
        let fm = FileManager.default
        let src = aggregatorDir + "/data/clash.yaml"
        let candidates = aggregatorDir + "/data/candidates.yaml"
        
        if fm.fileExists(atPath: src) {
            try? fm.removeItem(atPath: candidates) // remove old candidates
            try? fm.moveItem(atPath: src, toPath: candidates)
        }
        
        // Restore backup so the system has a valid state while we transition
        restoreBackupConfig()
    }
    
    private func prepareForValidation() {
        let fm = FileManager.default
        let src = aggregatorDir + "/data/candidates.yaml"
        let dst = aggregatorDir + "/data/clash.yaml"
        
        // If we have candidates, use them as the base for validation
        if fm.fileExists(atPath: src) {
            try? fm.removeItem(atPath: dst)
            try? fm.copyItem(atPath: src, toPath: dst)
        }
    }

    private func postProcess() {
        // 1. Archive
        let fileManager = FileManager.default
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd_HHmmss"
        let timestamp = formatter.string(from: Date())
        
        let src = aggregatorDir + "/data/clash.yaml"
        let filename = "clash_\(timestamp).yaml"
        let dst = yamlsDir + "/" + filename
        
        if fileManager.fileExists(atPath: src) {
            do {
                try fileManager.copyItem(atPath: src, toPath: dst)
                
                // 2. Diff Logic
                // previous file is yamlFiles.first (since we haven't refreshed list yet)
                if let prev = yamlFiles.first {
                    // diff logic (simple count diff)
                    let diff = validCount - prev.proxyCount
                    let symbol = diff >= 0 ? "+" : ""
                    self.diffMessage = "相比上次: \(symbol)\(diff)"
                } else {
                    self.diffMessage = "首次生成"
                }
                
                statusMessage = "已归档: \(filename)"
                
            } catch {
                print("Copy failed: \(error)")
                statusMessage = "归档失败"
            }
        }
        
        refreshYamlList()
    }
}

// MARK: - Views

@main
struct AirportAggregatorApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowStyle(HiddenTitleBarWindowStyle())
    }
}

struct ContentView: View {
    @StateObject private var model = AggregatorModel()
    @State private var isLogExpanded = true
    
    enum Tab {
        case crawl
        case validate
        case history
    }
    
    @State private var activeTab: Tab = .crawl
    
    var body: some View {
        HStack(spacing: 0) {
            // Sidebar
            VStack(alignment: .leading, spacing: 20) {
                Text("Antigravity\nAggregator")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .padding(.top, 40)
                    .padding(.horizontal)
                
                Divider().background(Color.white.opacity(0.2))
                
                Group {
                    SidebarButton(icon: "network", title: "全网抓取", subtitle: "搜索并验证新节点", isSelected: activeTab == .crawl) {
                        activeTab = .crawl
                    }
                    
                    SidebarButton(icon: "arrow.clockwise.circle.fill", title: "节点检测", subtitle: "快速验证现有节点", isSelected: activeTab == .validate) {
                        activeTab = .validate
                    }
                    
                    SidebarButton(icon: "doc.text.fill", title: "配置下载", subtitle: "查看和管理文件", isSelected: activeTab == .history) {
                        activeTab = .history
                    }
                }
                
                Spacer()
                
                // Mini Stats in Sidebar
                VStack(alignment: .leading, spacing: 8) {
                    Text("最近状态")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                    
                    HStack {
                        VStack(alignment: .leading) {
                            Text("\(model.validCount)")
                                .font(.title2).bold().foregroundColor(.white)
                            Text("可用节点")
                                .font(.caption2).foregroundColor(.white.opacity(0.7))
                        }
                        Spacer()
                        if !model.diffMessage.isEmpty {
                            Text(model.diffMessage)
                                .font(.caption)
                                .padding(4)
                                .background(Color.white.opacity(0.2))
                                .cornerRadius(4)
                                .foregroundColor(.white)
                        }
                    }
                }
                .padding()
                .background(Color.white.opacity(0.05))
                .cornerRadius(10)
                .padding(.horizontal)
                .padding(.bottom)
            }
            .frame(width: 260)
            .background(LinearGradient(gradient: Gradient(colors: [Color(hex: "#1a1a1a"), Color(hex: "#2d3436")]), startPoint: .top, endPoint: .bottom))
            
            // Main Content
            ZStack {
                Color(NSColor.windowBackgroundColor).ignoresSafeArea()
                
                if activeTab == .crawl {
                    CrawlPanel
                } else if activeTab == .validate {
                    ValidatePanel
                } else {
                    HistoryPanel
                }
            }
        }
        .frame(minWidth: 900, minHeight: 650)
    }
    
    // MARK: - Sub Views
    
    var CrawlPanel: some View {
        VStack(spacing: 0) {
            if model.isRunning {
                if model.currentRunMode == .crawl {
                    ProgressSection
                } else {
                    TaskRunningElsewhereView
                }
            } else {
                VStack(spacing: 30) {
                    Spacer()
                    Image(systemName: "network")
                        .font(.system(size: 80))
                        .foregroundColor(.indigo)
                    
                    VStack(spacing: 12) {
                        Text("全网节点抓取")
                            .font(.largeTitle).bold()
                        Text("从开源订阅源、Telegram 频道等渠道搜集节点，\n并进行连通性验证。过程可能需要较长时间。")
                            .multilineTextAlignment(.center)
                            .foregroundColor(.secondary)
                    }
                    
                    // Config
                    VStack(alignment: .leading) {
                        HStack {
                            Text("并发线程数")
                            Spacer()
                            Text("\(Int(model.threadCount))").foregroundColor(.secondary)
                        }
                        Slider(value: $model.threadCount, in: 1...256, step: 1)
                    }
                    .frame(width: 300)
                    .padding()
                    .background(Color(NSColor.controlBackgroundColor))
                    .cornerRadius(10)
                    
                    Button(action: { model.startTask(mode: .crawl) }) {
                        Text("开始全网抓取")
                            .font(.title3)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(width: 200, height: 50)
                            .background(Color.indigo)
                            .cornerRadius(25)
                            .shadow(radius: 5)
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                }
                .padding()
            }
        }
    }
    
    var ValidatePanel: some View {
        VStack(spacing: 0) {
            if model.isRunning {
                if model.currentRunMode == .refresh {
                    ProgressSection
                } else {
                    TaskRunningElsewhereView
                }
            } else {
                VStack(spacing: 30) {
                    Spacer()
                    Image(systemName: "arrow.clockwise.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)
                    
                    VStack(spacing: 12) {
                        Text("现有节点检测")
                            .font(.largeTitle).bold()
                        Text("仅对当前 `clash.yaml` 中的节点进行重新测速和验证，\n剔除失效节点。速度较快。")
                            .multilineTextAlignment(.center)
                            .foregroundColor(.secondary)
                    }
                    
                    // Config
                    VStack(alignment: .leading) {
                        HStack {
                            Text("并发线程数")
                            Spacer()
                            Text("\(Int(model.threadCount))").foregroundColor(.secondary)
                        }
                        Slider(value: $model.threadCount, in: 1...256, step: 1)
                    }
                    .frame(width: 300)
                    .padding()
                    .background(Color(NSColor.controlBackgroundColor))
                    .cornerRadius(10)
                    
                    Button(action: { model.startTask(mode: .refresh) }) {
                        Text("开始快速检测")
                            .font(.title3)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(width: 200, height: 50)
                            .background(Color.blue)
                            .cornerRadius(25)
                            .shadow(radius: 5)
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                }
                .padding()
            }
        }
    }
    
    var HistoryPanel: some View {
        VStack(alignment: .leading) {
            HStack {
                VStack(alignment: .leading) {
                    Text("配置文件下载").font(.largeTitle).bold()
                    Text("管理已生成的订阅文件").foregroundColor(.secondary)
                }
                Spacer()
                Button("打开 Clash Verge") { model.openClash() }
            }
            .padding([.horizontal, .top], 30)
            
            List {
                ForEach(model.yamlFiles) { file in
                    HStack {
                        Image(systemName: "doc.text.fill").foregroundColor(.orange)
                        VStack(alignment: .leading) {
                            Text(file.name).font(.headline)
                            Text("\(file.date.formatted()) · \(file.proxyCount) 节点").font(.caption).foregroundColor(.secondary)
                        }
                        Spacer()
                        
                        Button("在 Finder 中显示") {
                            NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: file.path)])
                        }
                        .buttonStyle(.bordered)
                        
                        Button(action: {
                            model.deleteYaml(file)
                        }) {
                            Image(systemName: "trash").foregroundColor(.red)
                        }
                        .buttonStyle(.plain)
                        .padding(.leading, 10)
                    }
                    .padding(.vertical, 4)
                }
            }
            .listStyle(.inset)
        }
    }
    
    var ProgressSection: some View {
        VStack(spacing: 0) {
            // Top Area: Progress & Status
            VStack {
                HStack(spacing: 40) {
                    ZStack {
                        Circle().stroke(lineWidth: 10).opacity(0.1).foregroundColor(.blue)
                        Circle().trim(from: 0, to: CGFloat(min(model.progress, 1.0)))
                            .stroke(style: StrokeStyle(lineWidth: 10, lineCap: .round))
                            .foregroundColor(.blue)
                            .rotationEffect(.degrees(-90))
                            .frame(width: 100, height: 100)
                        Text("\(Int(model.progress * 100))%")
                            .font(.title2).bold()
                    }
                    
                    VStack(alignment: .leading, spacing: 10) {
                        Text(model.statusMessage).font(.title).bold()
                        HStack {
                            Badge(text: model.totalCount > 0 ? "发现: \(model.totalCount) 节点" : "发现: \(model.sourceCount) 订阅",
                                  color: .gray)
                            Badge(text: "可用: \(model.validCount)", color: .green)
                        }
                    }
                }
                .padding(.vertical, 40)
                
                Button(action: { model.stopTask() }) {
                    Label("停止任务", systemImage: "stop.fill")
                        .foregroundColor(.red)
                }
                .buttonStyle(.plain)
                .padding(.bottom, 20)
            }
            .frame(maxWidth: .infinity)
            .background(Color(NSColor.controlBackgroundColor))
            
            Divider()
            
            // Bottom: Log
            DisclosureGroup("运行日志", isExpanded: $isLogExpanded) {
                ScrollViewReader { proxy in
                    ScrollView {
                        Text(model.output)
                            .font(.system(size: 11, design: .monospaced))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .id("bottom")
                    }
                    .frame(height: 300)
                    .background(Color(NSColor.textBackgroundColor))
                    .onChange(of: model.output) { _ in proxy.scrollTo("bottom", anchor: .bottom) }
                }
            }
            .padding()
            .background(Color(NSColor.windowBackgroundColor))
            
            Spacer()
        }
    }
    
    var TaskRunningElsewhereView: some View {
        VStack {
            Spacer()
            Image(systemName: "hourglass")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            Text("后台任务正在运行中")
                .font(.title).bold()
            Text("请切换到正在运行的任务标签页查看详情，\n或等待任务结束。")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding()
            Spacer()
        }
    }
}

struct Badge: View {
    let text: String
    let color: Color
    var body: some View {
        Text(text)
            .font(.caption).bold()
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.2))
            .foregroundColor(color)
            .cornerRadius(4)
    }
}

struct SidebarButton: View {
    let icon: String
    let title: String
    let subtitle: String
    var isSelected: Bool = false
    var customColor: Color? = nil
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    if isSelected {
                        Image(systemName: icon).font(.system(size: 16)).foregroundColor(.white)
                    } else if let c = customColor {
                        Image(systemName: icon).font(.system(size: 16)).foregroundColor(c)
                    } else {
                        Image(systemName: icon).font(.system(size: 16)).foregroundColor(.gray)
                    }
                }
                .frame(width: 36, height: 36)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(isSelected || customColor != nil ? .white : .white.opacity(0.8))
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundColor(isSelected || customColor != nil ? .white.opacity(0.8) : .white.opacity(0.5))
                }
                Spacer()
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(
                Group {
                    if let c = customColor {
                        c.opacity(0.2)
                    } else if isSelected {
                        Color.indigo
                    } else {
                        Color.white.opacity(0.05)
                    }
                }
            )
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
        .focusable(false)
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(.sRGB, red: Double(r)/255, green: Double(g)/255, blue: Double(b)/255, opacity: Double(a)/255)
    }
}
