// 网络监测系统
class NetworkMonitor {
    constructor() {
        this.isRunning = false;
        this.interval = 5000;
        this.timer = null;
        this.startTime = null;
        this.uptimeTimer = null;
        this.currentSessionId = null;
        this.stateSyncTimer = null; // 状态同步定时器
        this.heartbeatTimer = null; // 心跳定时器
        this.failureDurationTimer = null; // 故障时长更新定时器
        
        // 统计数据
        this.stats = {
            lan: { total: 0, success: 0, failures: 0, latencies: [], failureCount: 0, totalFailureDuration: 0 },
            wan: { total: 0, success: 0, failures: 0, latencies: [], failureCount: 0, totalFailureDuration: 0 },
            intl: { total: 0, success: 0, failures: 0, latencies: [], failureCount: 0, totalFailureDuration: 0 }
        };
        
        // 当前会话日志
        this.logs = [];
        this.maxLogs = 1000;
        
        // 故障状态
        this.failureStates = {
            lan: { isFailing: false, startTime: null },
            wan: { isFailing: false, startTime: null },
            intl: { isFailing: false, startTime: null }
        };
        
        this.initElements();
        this.bindEvents();
        this.loadSessions();
        
        // 启动状态同步
        this.startStateSync();
    }
    
    initElements() {
        // 控制按钮
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearLogsBtn = document.getElementById('clearLogsBtn');
        this.exportLogsBtn = document.getElementById('exportLogsBtn');
        this.intervalSelect = document.getElementById('intervalSelect');
        this.startTimeDisplay = document.getElementById('startTimeDisplay');
        
        // 状态元素
        this.elements = {
            lan: {
                card: document.getElementById('lanCard'),
                indicator: document.getElementById('lanIndicator'),
                status: document.getElementById('lanStatus'),
                latency: document.getElementById('lanLatency'),
                success: document.getElementById('lanSuccess'),
                failureCount: document.getElementById('lanFailureCount'),
                failureDuration: document.getElementById('lanFailureDuration'),
                lastCheck: document.getElementById('lanLastCheck')
            },
            wan: {
                card: document.getElementById('wanCard'),
                indicator: document.getElementById('wanIndicator'),
                status: document.getElementById('wanStatus'),
                latency: document.getElementById('wanLatency'),
                success: document.getElementById('wanSuccess'),
                failureCount: document.getElementById('wanFailureCount'),
                failureDuration: document.getElementById('wanFailureDuration'),
                lastCheck: document.getElementById('wanLastCheck')
            },
            intl: {
                card: document.getElementById('intlCard'),
                indicator: document.getElementById('intlIndicator'),
                status: document.getElementById('intlStatus'),
                latency: document.getElementById('intlLatency'),
                success: document.getElementById('intlSuccess'),
                failureCount: document.getElementById('intlFailureCount'),
                failureDuration: document.getElementById('intlFailureDuration'),
                lastCheck: document.getElementById('intlLastCheck')
            }
        };
        
        // 统计元素
        this.totalChecksEl = document.getElementById('totalChecks');
        this.totalFailuresEl = document.getElementById('totalFailures');
        this.uptimeEl = document.getElementById('uptime');
        this.avgLatencyLanEl = document.getElementById('avgLatencyLan');
        this.avgLatencyWanEl = document.getElementById('avgLatencyWan');
        this.avgLatencyIntlEl = document.getElementById('avgLatencyIntl');
        
        // 日志元素
        this.logList = document.getElementById('logList');
        this.logFilter = document.getElementById('logFilter');
        this.networkFilter = document.getElementById('networkFilter');
        this.sessionSelect = document.getElementById('sessionSelect');
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        this.exportLogsBtn.addEventListener('click', () => this.exportLogs());
        this.intervalSelect.addEventListener('change', (e) => {
            this.interval = parseInt(e.target.value);
            if (this.isRunning) {
                this.stop();
                this.start();
            }
        });
        this.logFilter.addEventListener('change', () => this.renderLogs());
        this.networkFilter.addEventListener('change', () => this.renderLogs());
        this.sessionSelect.addEventListener('change', (e) => this.loadSession(e.target.value));
    }
    
    start() {
        if (this.isRunning) return;
        
        this.startTime = Date.now();
        this.currentSessionId = 'session_' + this.startTime;
        this.logs = [];
        this.stats = {
            lan: { total: 0, success: 0, failures: 0, latencies: [], failureCount: 0, totalFailureDuration: 0 },
            wan: { total: 0, success: 0, failures: 0, latencies: [], failureCount: 0, totalFailureDuration: 0 },
            intl: { total: 0, success: 0, failures: 0, latencies: [], failureCount: 0, totalFailureDuration: 0 }
        };
        
        // 更新开始时间显示
        this.startTimeDisplay.textContent = new Date(this.startTime).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 更新服务器状态
        fetch('/api/network-monitor-state.php?action=start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: this.currentSessionId,
                startTime: new Date(this.startTime).toISOString(),
                interval: this.interval
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.isRunning = true;
                this.startBtn.classList.add('active');
                this.startBtn.textContent = '监测中...';
                
                // 切换到当前会话
                this.sessionSelect.value = 'current';
                
                // 更新会话列表以显示开始时间
                this.loadSessions();
                
                this.addLog('info', 'system', '网络监测已启动');
                
                // 立即执行一次检测
                this.checkAll();
                
                // 设置定时器
                this.timer = setInterval(() => this.checkAll(), this.interval);
                
                // 更新运行时间
                this.uptimeTimer = setInterval(() => this.updateUptime(), 1000);
                
                // 更新故障时长（每秒更新）
                this.failureDurationTimer = setInterval(() => this.updateFailureDurations(), 1000);
                
                // 启动心跳（每10秒发送一次）
                this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 10000);
            } else {
                alert('启动失败: ' + data.error);
            }
        })
        .catch(error => {
            console.error('启动失败:', error);
            alert('启动失败，请检查网络连接');
        });
    }
    
    stop() {
        if (!this.isRunning) return;
        
        // 更新服务器状态为停止
        fetch('/api/network-monitor-state.php?action=stop', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.isRunning = false;
                this.startBtn.classList.remove('active');
                this.startBtn.textContent = '开始监测';
                
                // 清空开始时间显示
                this.startTimeDisplay.textContent = '--';
                
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                
                if (this.uptimeTimer) {
                    clearInterval(this.uptimeTimer);
                    this.uptimeTimer = null;
                }
                
                if (this.failureDurationTimer) {
                    clearInterval(this.failureDurationTimer);
                    this.failureDurationTimer = null;
                }
                
                if (this.heartbeatTimer) {
                    clearInterval(this.heartbeatTimer);
                    this.heartbeatTimer = null;
                }
                
                this.addLog('info', 'system', '网络监测已停止');
                
                // 保存当前会话
                this.saveSession();
            }
        })
        .catch(error => {
            console.error('停止失败:', error);
        });
    }
    
    async checkAll() {
        await Promise.all([
            this.checkNetwork('lan', '/api/ping.php?target=192.168.1.1'),
            this.checkNetwork('wan', '/api/ping.php?target=114.114.114.114'),
            this.checkNetwork('intl', '/api/ping.php?target=8.8.8.8')
        ]);
        
        this.updateStats();
    }
    
    async checkNetwork(type, url) {
        const startTime = Date.now();
        const stats = this.stats[type];
        stats.total++;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000)
            });
            
            const latency = Date.now() - startTime;
            const data = await response.json();
            
            if (data.success) {
                stats.success++;
                stats.latencies.push(data.latency || latency);
                
                // 如果之前是故障状态，记录恢复
                if (this.failureStates[type].isFailing) {
                    const duration = Date.now() - this.failureStates[type].startTime;
                    stats.failureCount++;
                    stats.totalFailureDuration += duration;
                    this.addLog('info', type, `网络已恢复 (故障持续: ${this.formatDuration(duration)})`);
                    this.failureStates[type].isFailing = false;
                    this.failureStates[type].startTime = null;
                }
                
                this.updateStatus(type, 'online', data.latency || latency);
            } else {
                throw new Error(data.error || '连接失败');
            }
        } catch (error) {
            stats.failures++;
            
            // 如果是新故障，记录开始时间
            if (!this.failureStates[type].isFailing) {
                this.failureStates[type].isFailing = true;
                this.failureStates[type].startTime = Date.now();
                this.addLog('error', type, `网络故障: ${error.message}`);
            }
            
            this.updateStatus(type, 'offline', null, error.message);
        }
    }
    
    updateStatus(type, status, latency, error) {
        const el = this.elements[type];
        const now = new Date().toLocaleTimeString();
        
        // 更新卡片样式
        el.card.className = 'status-card ' + status;
        el.indicator.className = 'status-indicator ' + status;
        
        // 更新状态文本
        if (status === 'online') {
            el.status.textContent = '在线';
            el.status.className = 'info-value';
            el.latency.textContent = latency + ' ms';
            el.latency.className = 'info-value';
        } else {
            el.status.textContent = '离线';
            el.status.className = 'info-value error';
            el.latency.textContent = error || '超时';
            el.latency.className = 'info-value error';
        }
        
        // 更新成功率
        const stats = this.stats[type];
        const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(2) : 0;
        el.success.textContent = successRate + '%';
        
        // 更新故障次数
        el.failureCount.textContent = stats.failureCount || 0;
        
        // 更新最后检测时间
        el.lastCheck.textContent = now;
    }
    
    updateStats() {
        // 总检测次数
        const totalChecks = this.stats.lan.total + this.stats.wan.total + this.stats.intl.total;
        this.totalChecksEl.textContent = totalChecks;
        
        // 总故障次数
        const totalFailures = this.stats.lan.failures + this.stats.wan.failures + this.stats.intl.failures;
        this.totalFailuresEl.textContent = totalFailures;
        
        // 分别计算三个网络的平均延迟
        if (this.stats.lan.latencies.length > 0) {
            const avgLan = this.stats.lan.latencies.reduce((a, b) => a + b, 0) / this.stats.lan.latencies.length;
            this.avgLatencyLanEl.textContent = avgLan.toFixed(1) + ' ms';
        } else {
            this.avgLatencyLanEl.textContent = '-- ms';
        }
        
        if (this.stats.wan.latencies.length > 0) {
            const avgWan = this.stats.wan.latencies.reduce((a, b) => a + b, 0) / this.stats.wan.latencies.length;
            this.avgLatencyWanEl.textContent = avgWan.toFixed(1) + ' ms';
        } else {
            this.avgLatencyWanEl.textContent = '-- ms';
        }
        
        if (this.stats.intl.latencies.length > 0) {
            const avgIntl = this.stats.intl.latencies.reduce((a, b) => a + b, 0) / this.stats.intl.latencies.length;
            this.avgLatencyIntlEl.textContent = avgIntl.toFixed(1) + ' ms';
        } else {
            this.avgLatencyIntlEl.textContent = '-- ms';
        }
    }
    
    updateUptime() {
        if (!this.startTime) return;
        
        const duration = Date.now() - this.startTime;
        this.uptimeEl.textContent = this.formatDuration(duration);
    }
    
    updateFailureDurations() {
        // 更新三个网络的故障时长显示
        ['lan', 'wan', 'intl'].forEach(type => {
            const stats = this.stats[type];
            const el = this.elements[type];
            
            let displayDuration = this.formatDuration(stats.totalFailureDuration);
            
            // 如果当前正在故障中，加上当前故障的持续时间
            if (this.failureStates[type].isFailing) {
                const currentFailureDuration = Date.now() - this.failureStates[type].startTime;
                const totalDuration = stats.totalFailureDuration + currentFailureDuration;
                displayDuration = this.formatDuration(totalDuration);
            }
            
            el.failureDuration.textContent = displayDuration;
        });
    }
    
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        const h = hours.toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        
        return `${h}:${m}:${s}`;
    }
    
    addLog(type, network, message) {
        const log = {
            time: new Date().toISOString(),
            type: type,
            network: network,
            message: message
        };
        
        this.logs.unshift(log);
        
        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        this.renderLogs();
    }
    
    renderLogs() {
        const typeFilter = this.logFilter.value;
        const networkFilter = this.networkFilter.value;
        
        let filteredLogs = this.logs;
        
        if (typeFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.type === typeFilter);
        }
        
        if (networkFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.network === networkFilter);
        }
        
        this.logList.innerHTML = filteredLogs.map(log => {
            const time = new Date(log.time).toLocaleString();
            const typeClass = log.type === 'error' ? 'error' : log.type === 'warning' ? 'warning' : '';
            const networkName = {
                'lan': '内网',
                'wan': '国内',
                'intl': '国外',
                'system': '系统'
            }[log.network] || log.network;
            
            return `
                <div class="log-entry ${typeClass}">
                    <span class="log-time">[${time}]</span>
                    <span class="log-type">${log.type.toUpperCase()}</span>
                    <span class="log-type">[${networkName}]</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `;
        }).join('');
        
        if (filteredLogs.length === 0) {
            this.logList.innerHTML = '<div class="log-entry"><span class="log-message">暂无日志</span></div>';
        }
    }
    
    clearLogs() {
        if (confirm('确定要清除所有日志吗？')) {
            this.logs = [];
            this.renderLogs();
            this.addLog('info', 'system', '当前会话日志已清除');
        }
    }
    
    exportLogs() {
        const sessionId = this.sessionSelect.value;
        let exportData;
        let filename;
        
        if (sessionId === 'current') {
            exportData = {
                sessionId: this.currentSessionId || 'current',
                startTime: this.startTime ? new Date(this.startTime).toISOString() : null,
                endTime: new Date().toISOString(),
                logs: this.logs,
                stats: this.stats
            };
            filename = `network-logs-current-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        } else {
            const session = this.getSavedSession(sessionId);
            if (session) {
                exportData = session;
                filename = `network-logs-${sessionId}.json`;
            } else {
                alert('会话不存在');
                return;
            }
        }
        
        const data = JSON.stringify(exportData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addLog('info', 'system', '日志已导出');
    }
    
    saveSession() {
        if (!this.startTime || this.logs.length === 0) return;
        
        const sessionData = {
            sessionId: this.currentSessionId,
            startTime: new Date(this.startTime).toISOString(),
            endTime: new Date().toISOString(),
            logs: this.logs,
            stats: this.stats
        };
        
        // 保存到服务器
        fetch('/api/network-logs.php?action=save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('会话已保存到服务器:', this.currentSessionId);
                // 重新加载会话列表，并自动选中刚保存的会话
                this.loadSessions();
                // 延迟一下确保列表已更新，然后自动切换到刚保存的会话
                setTimeout(() => {
                    this.sessionSelect.value = this.currentSessionId;
                    this.loadSession(this.currentSessionId);
                }, 500);
            } else {
                console.error('保存会话失败:', data.error);
            }
        })
        .catch(error => {
            console.error('保存会话失败:', error);
        });
    }
    
    loadSessions() {
        fetch('/api/network-logs.php?action=list')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 保存当前选中的值
                const currentValue = this.sessionSelect.value;
                
                // 清空并重建选项
                // 当前会话显示开始时间
                let currentSessionText = '当前会话';
                if (this.startTime) {
                    const startTimeStr = new Date(this.startTime).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                    currentSessionText = `当前会话（开始时间：${startTimeStr}）`;
                }
                this.sessionSelect.innerHTML = `<option value="current">${currentSessionText}</option>`;
                
                // 添加历史会话，跳过与当前会话ID相同的
                data.sessions.forEach(session => {
                    // 如果历史会话ID与当前会话ID相同，跳过
                    if (this.currentSessionId && session.sessionId === this.currentSessionId) {
                        return;
                    }
                    
                    const startTime = new Date(session.startTime).toLocaleString();
                    const endTime = new Date(session.endTime).toLocaleString();
                    const option = document.createElement('option');
                    option.value = session.sessionId;
                    option.textContent = `${startTime} - ${endTime} (故障${session.failureCount || 0}次)`;
                    this.sessionSelect.appendChild(option);
                });
                
                // 恢复之前的选中值（如果存在）
                if (currentValue && currentValue !== 'current') {
                    const optionExists = Array.from(this.sessionSelect.options).some(opt => opt.value === currentValue);
                    if (optionExists) {
                        this.sessionSelect.value = currentValue;
                    }
                }
            }
        })
        .catch(error => {
            console.error('加载会话列表失败:', error);
        });
    }
    
    getSavedSession(sessionId) {
        return fetch(`/api/network-logs.php?action=load&sessionId=${sessionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                return data.session;
            }
            return null;
        })
        .catch(error => {
            console.error('获取会话失败:', error);
            return null;
        });
    }
    
    loadSession(sessionId) {
        if (sessionId === 'current') {
            // 显示当前会话
            this.renderLogs();
            this.updateStats();
            
            // 恢复当前会话的故障次数和故障时长显示
            ['lan', 'wan', 'intl'].forEach(type => {
                const el = this.elements[type];
                const stats = this.stats[type];
                
                // 故障次数
                el.failureCount.textContent = stats.failureCount || 0;
                
                // 故障时长（如果正在故障中，会由定时器更新）
                let displayDuration = this.formatDuration(stats.totalFailureDuration);
                if (this.failureStates[type].isFailing) {
                    const currentFailureDuration = Date.now() - this.failureStates[type].startTime;
                    const totalDuration = stats.totalFailureDuration + currentFailureDuration;
                    displayDuration = this.formatDuration(totalDuration);
                }
                el.failureDuration.textContent = displayDuration;
            });
        } else {
            // 加载历史会话
            this.getSavedSession(sessionId).then(session => {
                if (session) {
                    // 显示历史会话数据（不修改当前运行数据）
                    this.renderHistoryLogs(session.logs);
                    this.displayHistoryStats(session.stats);
                }
            });
        }
    }
    
    renderHistoryLogs(logs) {
        const typeFilter = this.logFilter.value;
        const networkFilter = this.networkFilter.value;
        
        let filteredLogs = logs;
        
        if (typeFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.type === typeFilter);
        }
        
        if (networkFilter !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.network === networkFilter);
        }
        
        this.logList.innerHTML = filteredLogs.map(log => {
            const time = new Date(log.time).toLocaleString();
            const typeClass = log.type === 'error' ? 'error' : log.type === 'warning' ? 'warning' : '';
            const networkName = {
                'lan': '内网',
                'wan': '国内',
                'intl': '国外',
                'system': '系统'
            }[log.network] || log.network;
            
            return `
                <div class="log-entry ${typeClass}">
                    <span class="log-time">[${time}]</span>
                    <span class="log-type">${log.type.toUpperCase()}</span>
                    <span class="log-type">[${networkName}]</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `;
        }).join('');
        
        if (filteredLogs.length === 0) {
            this.logList.innerHTML = '<div class="log-entry"><span class="log-message">暂无日志</span></div>';
        }
    }
    
    displayHistoryStats(stats) {
        console.log('显示历史统计数据:', stats);
        
        // 总检测次数
        const totalChecks = stats.lan.total + stats.wan.total + stats.intl.total;
        this.totalChecksEl.textContent = totalChecks;
        
        // 总故障次数
        const totalFailures = stats.lan.failures + stats.wan.failures + stats.intl.failures;
        this.totalFailuresEl.textContent = totalFailures;
        
        // 分别计算三个网络的平均延迟
        if (stats.lan.latencies.length > 0) {
            const avgLan = stats.lan.latencies.reduce((a, b) => a + b, 0) / stats.lan.latencies.length;
            this.avgLatencyLanEl.textContent = avgLan.toFixed(1) + ' ms';
        } else {
            this.avgLatencyLanEl.textContent = '-- ms';
        }
        
        if (stats.wan.latencies.length > 0) {
            const avgWan = stats.wan.latencies.reduce((a, b) => a + b, 0) / stats.wan.latencies.length;
            this.avgLatencyWanEl.textContent = avgWan.toFixed(1) + ' ms';
        } else {
            this.avgLatencyWanEl.textContent = '-- ms';
        }
        
        if (stats.intl.latencies.length > 0) {
            const avgIntl = stats.intl.latencies.reduce((a, b) => a + b, 0) / stats.intl.latencies.length;
            this.avgLatencyIntlEl.textContent = avgIntl.toFixed(1) + ' ms';
        } else {
            this.avgLatencyIntlEl.textContent = '-- ms';
        }
        
        // 更新三个网络卡片的故障次数和故障时长
        ['lan', 'wan', 'intl'].forEach(type => {
            const el = this.elements[type];
            const typeStat = stats[type];
            
            console.log(`${type} 故障数据:`, {
                failureCount: typeStat.failureCount,
                totalFailureDuration: typeStat.totalFailureDuration
            });
            
            // 故障次数（兼容旧数据）
            const failureCount = typeStat.failureCount !== undefined ? typeStat.failureCount : 0;
            el.failureCount.textContent = failureCount;
            
            // 故障时长（兼容旧数据）
            const duration = typeStat.totalFailureDuration !== undefined ? typeStat.totalFailureDuration : 0;
            el.failureDuration.textContent = this.formatDuration(duration);
            
            // 成功率
            const successRate = typeStat.total > 0 ? ((typeStat.success / typeStat.total) * 100).toFixed(2) : 0;
            el.success.textContent = successRate + '%';
        });
        
        // 运行时间显示为历史会话
        this.uptimeEl.textContent = '历史会话';
    }
    
    saveLogs() {
        // 已废弃，使用saveSession代替
    }
    
    loadLogs() {
        // 已废弃，使用loadSessions代替
    }
    
    // 状态同步方法
    startStateSync() {
        // 立即获取一次状态
        this.syncState();
        
        // 每3秒同步一次状态
        this.stateSyncTimer = setInterval(() => this.syncState(), 3000);
    }
    
    syncState() {
        fetch('/api/network-monitor-state.php?action=get')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.state) {
                const serverState = data.state;
                
                console.log('状态同步:', {
                    serverRunning: serverState.isRunning,
                    localRunning: this.isRunning,
                    sessionId: serverState.sessionId
                });
                
                // 如果服务器状态与本地状态不一致，同步
                if (serverState.isRunning && !this.isRunning) {
                    // 服务器正在运行，本地未运行 - 启动本地监测
                    console.log('检测到服务器正在运行，同步启动本地监测');
                    this.startFromServer(serverState);
                } else if (!serverState.isRunning && this.isRunning) {
                    // 服务器已停止，本地还在运行 - 停止本地监测
                    console.log('检测到服务器已停止，同步停止本地监测');
                    this.stopFromServer();
                }
            }
        })
        .catch(error => {
            console.error('同步状态失败:', error);
        });
    }
    
    startFromServer(serverState) {
        console.log('从服务器同步启动监测');
        this.isRunning = true;
        this.startTime = new Date(serverState.startTime).getTime();
        this.currentSessionId = serverState.sessionId;
        this.interval = serverState.interval;
        
        // 更新开始时间显示
        this.startTimeDisplay.textContent = new Date(this.startTime).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 从服务器同步统计数据
        if (serverState.stats) {
            this.stats = serverState.stats;
            
            // 检查是否有历史故障记录
            const totalFailures = (serverState.stats.lan?.failureCount || 0) +
                                 (serverState.stats.wan?.failureCount || 0) +
                                 (serverState.stats.intl?.failureCount || 0);
            
            if (totalFailures > 0) {
                this.addLog('info', 'system', `已同步到正在运行的监测会话（历史故障${totalFailures}次）`);
            } else {
                this.addLog('info', 'system', '已同步到正在运行的监测会话');
            }
        } else {
            // 初始化日志（如果为空）
            if (this.logs.length === 0) {
                this.addLog('info', 'system', '已同步到正在运行的监测会话');
            }
        }
        
        this.startBtn.classList.add('active');
        this.startBtn.textContent = '监测中...';
        this.sessionSelect.value = 'current';
        
        // 更新会话列表以显示开始时间
        this.loadSessions();
        
        // 更新统计显示
        this.updateStats();
        
        // 立即执行一次检测
        this.checkAll();
        
        // 设置定时器
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => this.checkAll(), this.interval);
        
        // 更新运行时间
        if (this.uptimeTimer) {
            clearInterval(this.uptimeTimer);
        }
        this.uptimeTimer = setInterval(() => this.updateUptime(), 1000);
        
        // 更新故障时长（每秒更新）
        if (this.failureDurationTimer) {
            clearInterval(this.failureDurationTimer);
        }
        this.failureDurationTimer = setInterval(() => this.updateFailureDurations(), 1000);
        
        // 启动心跳（每10秒发送一次）
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 10000);
    }
    
    stopFromServer() {
        console.log('从服务器同步停止监测');
        this.isRunning = false;
        this.startBtn.classList.remove('active');
        this.startBtn.textContent = '开始监测';
        
        // 清空开始时间显示
        this.startTimeDisplay.textContent = '--';
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        if (this.uptimeTimer) {
            clearInterval(this.uptimeTimer);
            this.uptimeTimer = null;
        }
        
        if (this.failureDurationTimer) {
            clearInterval(this.failureDurationTimer);
            this.failureDurationTimer = null;
        }
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    sendHeartbeat() {
        fetch('/api/network-monitor-state.php?action=heartbeat', {
            method: 'POST'
        })
        .then(response => response.json())
        .catch(error => {
            console.error('发送心跳失败:', error);
        });
    }
}

// 初始化
const monitor = new NetworkMonitor();

// 页面关闭时保存日志（使用sendBeacon确保数据发送）
window.addEventListener('beforeunload', () => {
    if (monitor.isRunning && monitor.startTime && monitor.logs.length > 0) {
        const sessionData = {
            sessionId: monitor.currentSessionId,
            startTime: new Date(monitor.startTime).toISOString(),
            endTime: new Date().toISOString(),
            logs: monitor.logs,
            stats: monitor.stats
        };
        
        // 使用sendBeacon发送数据，不会被页面卸载中断
        const blob = new Blob([JSON.stringify(sessionData)], { type: 'application/json' });
        navigator.sendBeacon('/api/network-logs.php?action=save', blob);
    }
});
