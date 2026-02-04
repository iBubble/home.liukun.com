class AirportAggregator {
    constructor() {
        this.speedTimeout = 3000;
        this.isServerRunning = false;
        this.isScanRunning = false;
        this.scanStatusInterval = null;
        this.currentTask = null;
        this.allNodes = []; // 存储所有节点
        this.currentLocation = 'all'; // 当前选择的地区
        this.currentSortBy = 'delay'; // 当前排序方式
        
        // 代理设置
        this.proxyEnable = false;
        this.proxyType = 'socks5';  // 默认SOCKS5
        this.proxyHost = '';
        this.proxyPort = '';
        this.proxyUsername = '';
        this.proxyPassword = '';
        this.proxyForScan = true;
        this.proxyForVerify = true;
        this.proxyForUpdate = false;
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.updateStatus();
        this.startStatusPolling();
        
        // 设置全局引用,供HTML中的事件使用
        window.aggregator = this;
    }

    bindEvents() {
        // 主要操作按钮
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        document.getElementById('verifyBtn').addEventListener('click', () => this.verifyNodes());
        document.getElementById('generateYamlBtn').addEventListener('click', () => this.generateYaml());
        document.getElementById('generateSubscriptionBtn').addEventListener('click', () => this.generateSubscription());
        
        // YAML文件上传
        document.getElementById('selectYamlBtn').addEventListener('click', () => this.selectYamlFile());
        document.getElementById('uploadYamlBtn').addEventListener('click', () => this.uploadYamlFile());
        document.getElementById('yamlFileInput').addEventListener('change', (e) => this.handleYamlFileSelect(e));
        
        // 扫描控制按钮
        document.getElementById('scanControlBtn').addEventListener('click', () => this.toggleScanTask());
        
        // 纯净度检测按钮
        document.getElementById('checkPurityBtn').addEventListener('click', () => this.checkPurity());
        
        // 地区筛选
        document.getElementById('filterLocation').addEventListener('change', (e) => this.filterByLocation(e.target.value));
        
        // 排序选择
        document.getElementById('sortBy').addEventListener('change', (e) => this.sortNodes(e.target.value));
        
        // 扫描任务控制
        document.getElementById('stopScanBtn').addEventListener('click', () => this.stopScan());
        document.getElementById('viewScanLogsBtn').addEventListener('click', () => this.viewScanLogs());
        
        // 工具按钮
        document.getElementById('updateCoreBtn').addEventListener('click', () => this.updateCore());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('clearLogBtn').addEventListener('click', () => this.clearLog());
        document.getElementById('refreshLogsBtn').addEventListener('click', () => this.refreshScanLogs());
        document.getElementById('downloadLogBtn').addEventListener('click', () => this.downloadLog());
        document.getElementById('copySubscriptionBtn').addEventListener('click', () => this.copySubscriptionUrl());
        
        // 全选节点
        document.getElementById('selectAllNodes').addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        
        // 设置模态框
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => this.hideSettings());
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideSettings());
        
        // 代理启用切换
        document.getElementById('proxyEnable').addEventListener('change', (e) => this.toggleProxySettings(e.target.checked));
        
        // 代理测试按钮
        document.getElementById('testProxyBtn').addEventListener('click', () => this.testProxy());
        
        // 点击模态框外部关闭
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.hideSettings();
            }
        });
    }

    async refreshData() {
        const btn = document.getElementById('refreshBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>刷新中...';
            
            this.addLog('[刷新] 正在从服务器加载最新数据...', 'info');
            
            // 更新状态并获取数据
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/status');
            const status = await response.json();
            
            // 更新界面
            this.isServerRunning = status.server_running;
            this.isScanRunning = status.scan_running;
            
            this.updateServerStatus();
            this.updateScanStatus(status);
            this.updateNodeCount(status.node_count, status.verified_count || 0);
            
            if (status.last_update) {
                document.getElementById('lastUpdate').textContent = new Date(status.last_update).toLocaleString('zh-CN');
            }
            
            // 加载节点列表
            await this.loadNodeList();
            
            this.addLog(`[成功] 数据刷新完成，已扫描 ${status.node_count} 个节点，可用 ${status.verified_count || 0} 个`, 'success');
            
        } catch (error) {
            this.addLog(`[错误] 刷新失败: ${error.message}`, 'error');
            console.error('刷新数据错误:', error);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    async verifyNodes() {
        const btn = document.getElementById('verifyBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>验证中...';
            
            this.addLog('[验证] 开始验证节点延迟...', 'info');
            
            // 显示验证面板
            this.updateVerifyStatus(true, 0, 0, 0);
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    speed_timeout: this.speedTimeout
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog(`[成功] 验证完成，${result.verified_count} 个节点可用`, 'success');
                this.updateNodeCount(result.total_count, result.verified_count);
                this.updateVerifyStatus(false);
                await this.loadNodeList();
                
                // 自动生成订阅链接（使用前50个最快节点，不受勾选影响）
                await this.autoGenerateSubscription();
            } else {
                this.addLog(`[错误] 验证失败: ${result.message}`, 'error');
                this.updateVerifyStatus(false);
            }
            
        } catch (error) {
            this.addLog(`[错误] 验证失败: ${error.message}`, 'error');
            this.updateVerifyStatus(false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    async generateYaml() {
        const btn = document.getElementById('generateYamlBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
            
            this.addLog('[生成] 正在生成YAML文件...', 'info');
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/generate-yaml', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selected_nodes: this.getSelectedNodes()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog(`[成功] YAML文件已生成: ${result.file_path}`, 'success');
                
                // 下载文件
                window.location.href = result.download_url;
            } else {
                this.addLog(`[错误] 生成失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 生成失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    async generateSubscription() {
        const btn = document.getElementById('generateSubscriptionBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
            
            // 获取勾选的节点
            const selectedNodes = this.getSelectedNodes();
            
            if (selectedNodes.length > 0) {
                this.addLog(`[订阅] 正在生成订阅链接（使用${selectedNodes.length}个勾选节点）...`, 'info');
            } else {
                this.addLog('[订阅] 正在生成订阅链接（自动选择前50个最快节点）...', 'info');
            }
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/generate-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selected_nodes: selectedNodes
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const subscriptionUrl = `https://home.liukun.com:8443/Projects/Aggregator/subscription.php`;
                document.getElementById('subscriptionUrlInput').value = subscriptionUrl;
                document.getElementById('subscriptionLinkSection').classList.remove('hidden');
                
                // 更新订阅描述文字
                const descText = document.getElementById('subscriptionDescText');
                if (selectedNodes.length > 0) {
                    descText.textContent = `此链接包含${result.node_count}个勾选的节点，可直接导入Clash客户端`;
                    this.addLog(`[成功] 订阅链接已生成，包含${result.node_count}个勾选节点`, 'success');
                } else {
                    descText.textContent = `此链接包含响应时间最快的前${result.node_count}个节点，可直接导入Clash客户端`;
                    this.addLog(`[成功] 订阅链接已生成，包含前${result.node_count}个最快节点`, 'success');
                }
            } else {
                this.addLog(`[错误] 生成失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 生成失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    async autoGenerateSubscription() {
        // 自动生成订阅（验证完成后调用，不受勾选影响，始终使用前50个最快节点）
        try {
            this.addLog('[订阅] 自动生成订阅链接（前50个最快节点）...', 'info');
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/generate-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selected_nodes: []  // 空数组表示自动选择前50个最快节点
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const subscriptionUrl = `https://home.liukun.com:8443/Projects/Aggregator/subscription.php`;
                document.getElementById('subscriptionUrlInput').value = subscriptionUrl;
                document.getElementById('subscriptionLinkSection').classList.remove('hidden');
                
                // 更新订阅描述文字
                const descText = document.getElementById('subscriptionDescText');
                descText.textContent = `此链接包含响应时间最快的前${result.node_count}个节点，可直接导入Clash客户端`;
                
                this.addLog(`[成功] 订阅链接已自动生成，包含前${result.node_count}个最快节点`, 'success');
            } else {
                this.addLog(`[错误] 自动生成订阅失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 自动生成订阅失败: ${error.message}`, 'error');
        }
    }

    async checkPurity() {
        const btn = document.getElementById('checkPurityBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>检测中...';
            
            this.addLog('[纯净度] 开始检测节点IP纯净度...', 'info');
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/check-purity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog(`[成功] 纯净度检测完成，${result.checked_count} 个节点已检测`, 'success');
                await this.loadNodeList();
            } else {
                this.addLog(`[错误] 纯净度检测失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 纯净度检测失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    sortNodes(sortBy) {
        this.currentSortBy = sortBy;
        this.addLog(`[排序] 按${sortBy === 'delay' ? '响应时间' : '纯净度'}排序`, 'info');
        this.renderFilteredNodes();
    }

    filterByLocation(location) {
        this.currentLocation = location;
        this.addLog(`[筛选] ${location === 'all' ? '显示所有地区' : '筛选地区: ' + location}`, 'info');
        this.renderFilteredNodes();
    }

    updateLocationFilter(nodes) {
        // 统计所有地区
        const locationCount = {};
        nodes.forEach(node => {
            const location = node.location || '未知';
            locationCount[location] = (locationCount[location] || 0) + 1;
        });

        // 按节点数量排序
        const sortedLocations = Object.entries(locationCount)
            .sort((a, b) => b[1] - a[1])
            .map(([location, count]) => ({ location, count }));

        // 更新下拉框
        const select = document.getElementById('filterLocation');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="all">所有</option>';
        
        sortedLocations.forEach(({ location, count }) => {
            if (location !== '未知') {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = `${location} (${count})`;
                select.appendChild(option);
            }
        });

        // 添加"其他"选项（未知地区）
        if (locationCount['未知'] > 0) {
            const option = document.createElement('option');
            option.value = '未知';
            option.textContent = `其他 (${locationCount['未知']})`;
            select.appendChild(option);
        }

        // 恢复之前的选择
        select.value = currentValue;
    }

    renderFilteredNodes() {
        let filteredNodes = [...this.allNodes];

        // 按地区筛选
        if (this.currentLocation !== 'all') {
            filteredNodes = filteredNodes.filter(node => {
                const location = node.location || '未知';
                return location === this.currentLocation;
            });
        }

        // 排序
        if (this.currentSortBy === 'purity') {
            filteredNodes.sort((a, b) => {
                const purityA = a.purity !== undefined ? a.purity : -1;
                const purityB = b.purity !== undefined ? b.purity : -1;
                return purityB - purityA;
            });
        } else {
            filteredNodes.sort((a, b) => {
                if (a.delay === null && b.delay === null) return 0;
                if (a.delay === null) return 1;
                if (b.delay === null) return -1;
                return a.delay - b.delay;
            });
        }

        this.renderNodeList(filteredNodes);
    }

    getSelectedNodes() {
        const checkboxes = document.querySelectorAll('.node-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.nodeName);
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.node-checkbox');
        checkboxes.forEach(cb => cb.checked = checked);
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const count = document.querySelectorAll('.node-checkbox:checked').length;
        document.getElementById('selectedCount').textContent = count;
    }

    async startServer() {
        try {
            this.addLog('[服务器] 正在启动订阅服务器...', 'info');
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/server/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    port: this.serverPort
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isServerRunning = true;
                this.updateServerStatus();
                this.showSubscriptionSection();
                this.addLog(`[服务器] 订阅服务器已启动，端口: ${this.serverPort}`, 'success');
            } else {
                this.addLog(`[错误] 服务器启动失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 服务器启动失败: ${error.message}`, 'error');
        }
    }

    async stopServer() {
        try {
            this.addLog('[服务器] 正在停止订阅服务器...', 'info');
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/server/stop', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isServerRunning = false;
                this.updateServerStatus();
                this.hideSubscriptionSection();
                this.addLog('[服务器] 订阅服务器已停止', 'info');
            } else {
                this.addLog(`[错误] 服务器停止失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 服务器停止失败: ${error.message}`, 'error');
        }
    }

    async updateCore() {
        const btn = document.getElementById('updateCoreBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>更新中...';
            
            this.addLog('[更新] 正在更新核心代码...', 'info');
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/update-core', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    github_token: this.githubToken
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog('[更新] 核心代码更新成功', 'success');
            } else {
                this.addLog(`[错误] 核心代码更新失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 核心代码更新失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    async updateStatus() {
        try {
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/status');
            const status = await response.json();
            
            this.isServerRunning = status.server_running;
            this.isScanRunning = status.scan_running;
            
            this.updateServerStatus();
            this.updateScanStatus(status);
            this.updateNodeCount(status.node_count, status.verified_count || 0);
            
            if (status.last_update) {
                document.getElementById('lastUpdate').textContent = new Date(status.last_update).toLocaleString('zh-CN');
            }
            
            // 如果有扫描任务在运行，启动状态轮询
            if (status.scan_running && !this.scanStatusInterval) {
                this.startScanStatusPolling();
            } else if (!status.scan_running && this.scanStatusInterval) {
                this.stopScanStatusPolling();
            }
            
        } catch (error) {
            console.error('获取状态失败:', error);
        }
    }

    updateScanStatus(status) {
        const indicator = document.getElementById('scanTaskStatus');
        const statusText = document.getElementById('scanTaskStatusText');
        const panel = document.getElementById('scanStatusPanel');
        
        if (status.scan_running) {
            indicator.className = 'status-indicator status-running';
            statusText.textContent = '运行中';
            panel.classList.remove('hidden');
            
            // 更新详细信息
            document.getElementById('scanPid').textContent = status.scan_pid || '-';
            document.getElementById('scanStartTime').textContent = status.scan_start_time || '-';
            document.getElementById('scanStage').textContent = status.scan_stage || '正在扫描...';
            
            // 更新节点数量 - 扫描面板中的显示
            const scannedElem = document.getElementById('scanPanelNodeCount');
            const availableElem = document.getElementById('scanPanelVerifiedCount');
            if (scannedElem) scannedElem.textContent = status.node_count || 0;
            if (availableElem) availableElem.textContent = status.verified_count || 0;
            
            if (status.scan_duration) {
                const minutes = Math.floor(status.scan_duration / 60);
                const seconds = status.scan_duration % 60;
                document.getElementById('scanDuration').textContent = `${minutes}分${seconds}秒`;
            }
        } else {
            indicator.className = 'status-indicator status-stopped';
            statusText.textContent = '未运行';
            panel.classList.add('hidden');
        }
        
        // 更新控制按钮
        this.updateScanControlButton();
    }

    updateVerifyStatus(running, progress, total, available) {
        const panel = document.getElementById('verifyStatusPanel');
        
        if (running) {
            panel.classList.remove('hidden');
            document.getElementById('verifyProgress').textContent = progress || 0;
            document.getElementById('verifyTotal').textContent = total || 0;
            document.getElementById('verifyAvailable').textContent = available || 0;
            
            const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
            document.getElementById('verifyProgressPercent').textContent = percent + '%';
            document.getElementById('verifyProgressBar').style.width = percent + '%';
            
            if (progress === total && total > 0) {
                document.getElementById('verifyProgressText').textContent = '验证完成！';
            } else {
                document.getElementById('verifyProgressText').textContent = `正在验证节点 (${progress}/${total})...`;
            }
        } else {
            panel.classList.add('hidden');
        }
    }

    async startScanStatusPolling() {
        // 如果已经有轮询在运行，先停止
        if (this.scanStatusInterval) {
            clearInterval(this.scanStatusInterval);
            this.scanStatusInterval = null;
        }
        
        let lastLogLine = 0; // 记录已读取的日志行数
        
        this.scanStatusInterval = setInterval(async () => {
            try {
                const response = await fetch('/Projects/Aggregator/api/index.php?path=/scan/status');
                const data = await response.json();
                
                if (data.success) {
                    // 更新进度信息
                    if (data.progress) {
                        document.getElementById('scanStage').textContent = data.progress.message || '正在扫描...';
                        document.getElementById('scanProgressText').textContent = data.progress.message || '正在扫描...';
                        
                        if (data.progress.percentage > 0) {
                            document.getElementById('scanProgressPercent').textContent = data.progress.percentage + '%';
                            document.getElementById('scanProgressBar').style.width = data.progress.percentage + '%';
                        } else if (data.progress.current > 0) {
                            document.getElementById('scanProgressPercent').textContent = `${data.progress.current} 个`;
                            const estimatedPercent = Math.min(50, (data.progress.current / 100) * 100);
                            document.getElementById('scanProgressBar').style.width = estimatedPercent + '%';
                        }
                    }
                    
                    // 更新运行时长
                    if (data.duration) {
                        const minutes = Math.floor(data.duration / 60);
                        const seconds = data.duration % 60;
                        document.getElementById('scanDuration').textContent = `${minutes}分${seconds}秒`;
                    }
                    
                    // 更新节点数 - 同时更新顶部卡片和扫描面板
                    if (data.node_count !== undefined) {
                        const nodeCount = data.node_count || 0;
                        const verifiedCount = data.verified_count || 0;
                        
                        // 更新顶部状态卡片
                        this.updateNodeCount(nodeCount, verifiedCount);
                        
                        // 更新扫描面板中的显示
                        const scannedElem = document.getElementById('scanPanelNodeCount');
                        const availableElem = document.getElementById('scanPanelVerifiedCount');
                        if (scannedElem) scannedElem.textContent = nodeCount;
                        if (availableElem) availableElem.textContent = verifiedCount;
                    }
                    
                    // 实时显示扫描日志（只显示新增的日志）
                    if (data.logs && Array.isArray(data.logs)) {
                        const newLogs = data.logs.slice(lastLogLine);
                        if (newLogs.length > 0) {
                            const container = document.getElementById('logContainer');
                            newLogs.forEach(log => {
                                const logEntry = document.createElement('div');
                                
                                // 根据日志内容设置颜色
                                if (log.includes('✅') || log.includes('成功') || log.includes('finished')) {
                                    logEntry.className = 'text-green-400';
                                } else if (log.includes('❌') || log.includes('错误') || log.includes('失败') || log.includes('error')) {
                                    logEntry.className = 'text-red-400';
                                } else if (log.includes('⚠️') || log.includes('警告') || log.includes('warning')) {
                                    logEntry.className = 'text-yellow-400';
                                } else if (log.includes('📡') || log.includes('正在') || log.includes('crawl') || log.includes('fetch')) {
                                    logEntry.className = 'text-blue-400';
                                } else {
                                    logEntry.className = 'text-gray-300';
                                }
                                
                                logEntry.textContent = log;
                                container.appendChild(logEntry);
                            });
                            
                            // 自动滚动到底部
                            container.scrollTop = container.scrollHeight;
                            
                            // 限制日志条数（保留最后200条）
                            const logs = container.children;
                            while (logs.length > 200) {
                                container.removeChild(logs[0]);
                            }
                            
                            lastLogLine = data.logs.length;
                        }
                    }
                    
                    // 如果任务已完成
                    if (!data.running && this.isScanRunning) {
                        this.stopScanStatusPolling();
                        this.isScanRunning = false;
                        this.addLog('[扫描] 扫描任务已完成', 'success');
                        this.updateScanControlButton();
                        this.loadNodeList();
                    }
                }
            } catch (error) {
                console.error('获取扫描状态失败:', error);
            }
        }, 3000); // 每3秒更新一次
    }

    stopScanStatusPolling() {
        if (this.scanStatusInterval) {
            clearInterval(this.scanStatusInterval);
            this.scanStatusInterval = null;
        }
    }

    async toggleScanTask() {
        if (this.isScanRunning) {
            // 如果正在运行，则停止
            await this.stopScan();
        } else {
            // 如果未运行，则开始扫描
            await this.startScan();
        }
    }

    async startScan() {
        const btn = document.getElementById('scanControlBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>启动中...';
            
            this.addLog('[扫描] 正在启动扫描任务...', 'info');
            
            // 准备代理配置
            const proxyConfig = this.proxyEnable ? {
                enable: true,
                type: this.proxyType,
                host: this.proxyHost,
                port: this.proxyPort,
                username: this.proxyUsername,
                password: this.proxyPassword
            } : { enable: false };
            
            if (this.proxyEnable) {
                this.addLog(`[代理] 使用代理: ${this.proxyType}://${this.proxyHost}:${this.proxyPort}`, 'info');
            }
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    proxy: proxyConfig
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog('[成功] 扫描任务已启动', 'success');
                this.isScanRunning = true;
                
                // 直接使用API返回的节点数（应该是0），不要调用updateStatus读取旧数据
                this.updateNodeCount(result.node_count || 0, result.verified_count || 0);
                
                this.updateScanControlButton();
                this.startScanStatusPolling();
            } else {
                this.addLog(`[错误] 启动失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 启动失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            this.updateScanControlButton();
        }
    }

    updateScanControlButton() {
        const btn = document.getElementById('scanControlBtn');
        
        if (this.isScanRunning) {
            btn.innerHTML = '<i class="fas fa-stop mr-1"></i>停止扫描';
            btn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-all';
        } else {
            btn.innerHTML = '<i class="fas fa-play mr-1"></i>开始扫描';
            btn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all';
        }
        
        // 显示按钮
        btn.classList.remove('hidden');
    }

    async stopScan() {
        if (!confirm('确定要停止当前扫描任务吗？')) {
            return;
        }
        
        try {
            this.addLog('[扫描] 正在停止扫描任务...', 'info');
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/scan/stop', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog('[成功] 扫描任务已停止', 'success');
                this.stopScanStatusPolling();
                this.isScanRunning = false;
                this.updateScanControlButton();
                this.updateStatus();
            } else {
                this.addLog(`[错误] ${result.message}`, 'error');
            }
        } catch (error) {
            this.addLog(`[错误] 停止扫描失败: ${error.message}`, 'error');
        }
    }

    async viewScanLogs() {
        try {
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/scan/logs&lines=100');
            const result = await response.json();
            
            if (result.success && result.logs) {
                // 清空当前日志
                const container = document.getElementById('logContainer');
                container.innerHTML = '';
                
                // 显示扫描日志
                result.logs.forEach(log => {
                    const logEntry = document.createElement('div');
                    logEntry.className = 'text-gray-300';
                    logEntry.textContent = log;
                    container.appendChild(logEntry);
                });
                
                container.scrollTop = container.scrollHeight;
                this.addLog('[日志] 已加载扫描日志', 'info');
            }
        } catch (error) {
            this.addLog(`[错误] 加载日志失败: ${error.message}`, 'error');
        }
    }

    async refreshScanLogs() {
        await this.viewScanLogs();
    }

    async loadNodeList() {
        try {
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/nodes');
            const result = await response.json();
            
            if (result.success) {
                this.allNodes = result.nodes || [];
                this.updateLocationFilter(this.allNodes);
                this.renderFilteredNodes();
            }
            
        } catch (error) {
            console.error('加载节点列表失败:', error);
        }
    }

    renderNodeList(nodes) {
        const container = document.getElementById('nodeList');
        
        if (!nodes || nodes.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-search text-4xl mb-4"></i>
                    <p>暂无节点数据，请先执行验证操作</p>
                </div>
            `;
            return;
        }
        
        const nodeHtml = nodes.map((node, index) => {
            // 纯净度显示
            let purityHtml = '';
            if (node.purity !== undefined) {
                let purityColor = 'text-gray-500';
                let purityIcon = 'fa-question-circle';
                
                if (node.purity >= 90) {
                    purityColor = 'text-green-600';
                    purityIcon = 'fa-shield-alt';
                } else if (node.purity >= 70) {
                    purityColor = 'text-blue-600';
                    purityIcon = 'fa-shield-alt';
                } else if (node.purity >= 50) {
                    purityColor = 'text-yellow-600';
                    purityIcon = 'fa-shield-alt';
                } else {
                    purityColor = 'text-red-600';
                    purityIcon = 'fa-exclamation-triangle';
                }
                
                purityHtml = `
                    <div class="text-xs ${purityColor} mt-1">
                        <i class="fas ${purityIcon} mr-1"></i>纯净度 ${node.purity}
                    </div>
                `;
            }
            
            return `
                <div class="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                    <input type="checkbox" class="node-checkbox w-4 h-4 mr-3 cursor-pointer" 
                           data-node-name="${node.name}" 
                           onchange="window.aggregator.updateSelectedCount()">
                    <div class="flex items-center flex-1">
                        <div class="w-3 h-3 rounded-full ${node.status === 'active' ? 'bg-green-500' : node.status === 'slow' ? 'bg-yellow-500' : 'bg-gray-400'} mr-3"></div>
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">${node.name || '未命名节点'}</h4>
                            <p class="text-sm text-gray-500">${node.type} | ${node.location || '未知位置'} | ${node.server}</p>
                            ${purityHtml}
                        </div>
                    </div>
                    <div class="text-right ml-4">
                        ${node.delay ? `
                            <div class="text-sm font-medium ${node.delay < 200 ? 'text-green-600' : node.delay < 500 ? 'text-yellow-600' : 'text-red-600'}">
                                ${node.delay}ms
                            </div>
                            <div class="text-xs text-gray-500">#${index + 1}</div>
                        ` : `
                            <div class="text-sm text-gray-500">未测试</div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = nodeHtml;
        this.updateSelectedCount();
    }

    updateServerStatus() {
        const statusIndicator = document.getElementById('serviceStatus');
        const statusText = document.getElementById('serviceStatusText');
        
        if (!statusIndicator || !statusText) {
            return; // 元素不存在,直接返回
        }
        
        if (this.isServerRunning) {
            statusIndicator.className = 'status-indicator status-running';
            statusText.textContent = '运行中';
        } else {
            statusIndicator.className = 'status-indicator status-stopped';
            statusText.textContent = '已停止';
        }
    }

    updateNodeCount(scanned, verified) {
        // 直接更新节点数，不保留旧数据
        document.getElementById('totalNodeCount').textContent = scanned || 0;
        document.getElementById('availableNodeCount').textContent = verified || 0;
    }

    updateLastUpdate() {
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('zh-CN');
    }

    showProgress() {
        document.getElementById('progressContainer').classList.remove('hidden');
        this.updateProgress(0, '准备中...');
    }

    hideProgress() {
        document.getElementById('progressContainer').classList.add('hidden');
    }

    updateProgress(percent, text) {
        document.getElementById('progressBar').style.width = percent + '%';
        document.getElementById('progressPercent').textContent = percent + '%';
        document.getElementById('progressText').textContent = text;
    }

    showSubscriptionSection() {
        const section = document.getElementById('subscriptionSection');
        const url = `http://127.0.0.1:${this.serverPort}/clash.yaml`;
        document.getElementById('subscriptionUrl').textContent = url;
        section.classList.remove('hidden');
    }

    hideSubscriptionSection() {
        document.getElementById('subscriptionSection').classList.add('hidden');
    }

    copySubscriptionUrl() {
        const url = document.getElementById('subscriptionUrlInput').value;
        navigator.clipboard.writeText(url).then(() => {
            this.addLog('[复制] 订阅链接已复制到剪贴板', 'success');
            
            // 临时改变按钮文字
            const btn = document.getElementById('copySubscriptionBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>已复制';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        });
    }

    addLog(message, type = 'info') {
        const container = document.getElementById('logContainer');
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        const colorClass = {
            'info': 'text-blue-400',
            'success': 'text-green-400',
            'error': 'text-red-400',
            'warning': 'text-yellow-400'
        }[type] || 'text-gray-400';
        
        const logEntry = document.createElement('div');
        logEntry.className = colorClass;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        container.appendChild(logEntry);
        container.scrollTop = container.scrollHeight;
        
        // 限制日志条数
        const logs = container.children;
        if (logs.length > 100) {
            container.removeChild(logs[0]);
        }
    }

    clearLog() {
        document.getElementById('logContainer').innerHTML = '';
        this.addLog('日志已清空', 'info');
    }

    downloadLog() {
        const logs = document.getElementById('logContainer').innerText;
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aggregator-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    showSettings() {
        // 代理设置
        document.getElementById('proxyEnable').checked = this.proxyEnable;
        document.getElementById('proxyType').value = this.proxyType;
        document.getElementById('proxyHost').value = this.proxyHost;
        document.getElementById('proxyPort').value = this.proxyPort;
        document.getElementById('proxyUsername').value = this.proxyUsername;
        document.getElementById('proxyPassword').value = this.proxyPassword;
        
        // 代理使用范围
        document.getElementById('proxyForScan').checked = this.proxyForScan;
        document.getElementById('proxyForVerify').checked = this.proxyForVerify;
        document.getElementById('proxyForUpdate').checked = this.proxyForUpdate;
        
        this.toggleProxySettings(this.proxyEnable);
        
        // 清空测试结果
        document.getElementById('proxyTestResult').classList.add('hidden');
        
        document.getElementById('settingsModal').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    toggleProxySettings(enabled) {
        const proxySettings = document.getElementById('proxySettings');
        if (enabled) {
            proxySettings.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            proxySettings.classList.add('opacity-50', 'pointer-events-none');
        }
    }

    saveSettings() {
        // 代理设置
        this.proxyEnable = document.getElementById('proxyEnable').checked;
        this.proxyType = document.getElementById('proxyType').value;
        this.proxyHost = document.getElementById('proxyHost').value;
        this.proxyPort = document.getElementById('proxyPort').value;
        this.proxyUsername = document.getElementById('proxyUsername').value;
        this.proxyPassword = document.getElementById('proxyPassword').value;
        
        // 代理使用范围
        this.proxyForScan = document.getElementById('proxyForScan').checked;
        this.proxyForVerify = document.getElementById('proxyForVerify').checked;
        this.proxyForUpdate = document.getElementById('proxyForUpdate').checked;
        
        localStorage.setItem('aggregator_settings', JSON.stringify({
            speedTimeout: this.speedTimeout,
            proxyEnable: this.proxyEnable,
            proxyType: this.proxyType,
            proxyHost: this.proxyHost,
            proxyPort: this.proxyPort,
            proxyUsername: this.proxyUsername,
            proxyPassword: this.proxyPassword,
            proxyForScan: this.proxyForScan,
            proxyForVerify: this.proxyForVerify,
            proxyForUpdate: this.proxyForUpdate
        }));
        
        this.hideSettings();
        
        if (this.proxyEnable && this.proxyHost && this.proxyPort) {
            this.addLog(`[设置] 配置已保存，代理: ${this.proxyType}://${this.proxyHost}:${this.proxyPort}`, 'success');
        } else {
            this.addLog('[设置] 配置已保存', 'success');
        }
    }

    loadSettings() {
        const settings = localStorage.getItem('aggregator_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.speedTimeout = parsed.speedTimeout || 3000;
            
            // 代理设置
            this.proxyEnable = parsed.proxyEnable || false;
            this.proxyType = parsed.proxyType || 'socks5';
            this.proxyHost = parsed.proxyHost || '';
            this.proxyPort = parsed.proxyPort || '';
            this.proxyUsername = parsed.proxyUsername || '';
            this.proxyPassword = parsed.proxyPassword || '';
            
            // 代理使用范围
            this.proxyForScan = parsed.proxyForScan !== undefined ? parsed.proxyForScan : true;
            this.proxyForVerify = parsed.proxyForVerify !== undefined ? parsed.proxyForVerify : true;
            this.proxyForUpdate = parsed.proxyForUpdate !== undefined ? parsed.proxyForUpdate : false;
        }
    }

    async testProxy() {
        const btn = document.getElementById('testProxyBtn');
        const resultDiv = document.getElementById('proxyTestResult');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>测试中...';
            resultDiv.classList.add('hidden');
            
            // 获取当前输入的代理配置
            const proxyConfig = {
                enable: document.getElementById('proxyEnable').checked,
                type: document.getElementById('proxyType').value,
                host: document.getElementById('proxyHost').value,
                port: document.getElementById('proxyPort').value,
                username: document.getElementById('proxyUsername').value,
                password: document.getElementById('proxyPassword').value
            };
            
            if (!proxyConfig.enable) {
                resultDiv.innerHTML = '<div class="text-yellow-600"><i class="fas fa-exclamation-triangle mr-1"></i>请先启用代理</div>';
                resultDiv.classList.remove('hidden');
                return;
            }
            
            if (!proxyConfig.host || !proxyConfig.port) {
                resultDiv.innerHTML = '<div class="text-yellow-600"><i class="fas fa-exclamation-triangle mr-1"></i>请填写代理地址和端口</div>';
                resultDiv.classList.remove('hidden');
                return;
            }
            
            this.addLog('[代理] 正在测试代理连接...', 'info');
            
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/test-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ proxy: proxyConfig })
            });
            
            const result = await response.json();
            
            if (result.success) {
                resultDiv.innerHTML = `<div class="text-green-600"><i class="fas fa-check-circle mr-1"></i>${result.message}</div>`;
                this.addLog(`[代理] ${result.message}`, 'success');
            } else {
                resultDiv.innerHTML = `<div class="text-red-600"><i class="fas fa-times-circle mr-1"></i>${result.message}</div>`;
                this.addLog(`[代理] ${result.message}`, 'error');
            }
            
            resultDiv.classList.remove('hidden');
            
        } catch (error) {
            resultDiv.innerHTML = `<div class="text-red-600"><i class="fas fa-times-circle mr-1"></i>测试失败: ${error.message}</div>`;
            resultDiv.classList.remove('hidden');
            this.addLog(`[代理] 测试失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    startStatusPolling() {
        setInterval(() => {
            this.updateStatus();
        }, 5000); // 每5秒更新一次状态
    }

    // YAML文件上传功能
    selectYamlFile() {
        document.getElementById('yamlFileInput').click();
    }

    handleYamlFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const fileInfo = document.getElementById('yamlFileInfo');
            const fileName = document.getElementById('yamlFileName');
            const uploadBtn = document.getElementById('uploadYamlBtn');
            
            fileName.textContent = file.name;
            fileInfo.classList.remove('hidden');
            uploadBtn.disabled = false;
            
            this.addLog(`[文件] 已选择文件: ${file.name}`, 'info');
        }
    }

    async uploadYamlFile() {
        const fileInput = document.getElementById('yamlFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            this.addLog('[错误] 请先选择YAML文件', 'error');
            return;
        }
        
        const btn = document.getElementById('uploadYamlBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>上传中...';
            
            this.addLog('[上传] 正在上传并解析YAML文件...', 'info');
            
            // 读取文件内容
            const fileContent = await file.text();
            
            // 发送到服务器
            const response = await fetch('/Projects/Aggregator/api/index.php?path=/upload-yaml', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: file.name,
                    content: fileContent
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog(`[成功] 文件上传成功，解析到 ${result.node_count} 个节点`, 'success');
                
                // 更新节点计数
                this.updateNodeCount(result.node_count, 0);
                
                // 自动开始验证
                this.addLog('[验证] 开始验证上传的节点...', 'info');
                await this.verifyNodes();
                
                // 清空文件选择
                fileInput.value = '';
                document.getElementById('yamlFileInfo').classList.add('hidden');
                btn.disabled = true;
                
            } else {
                this.addLog(`[错误] 上传失败: ${result.message}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`[错误] 上传失败: ${error.message}`, 'error');
        } finally {
            btn.innerHTML = originalText;
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new AirportAggregator();
});