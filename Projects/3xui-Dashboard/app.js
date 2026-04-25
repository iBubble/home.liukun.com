// === 3x-ui Control Center - 前端逻辑 ===
const API = 'api/proxy.php';
const REFRESH_MS = 30000;
let allData = null, activeTab = 'all', timer = null, authToken = '', isLoading = false;

// === 鉴权 ===
function checkAuth() {
    authToken = sessionStorage.getItem('3xui_auth') || '';
    if (authToken) {
        document.getElementById('loginOverlay').classList.add('hidden');
        loadAllData();
        startAutoRefresh();
    }
}

async function doLogin() {
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginErr');
    try {
        const r = await fetch(`${API}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const j = await r.json();
        if (j.success) {
            authToken = btoa(u + ':' + p);
            sessionStorage.setItem('3xui_auth', authToken);
            document.getElementById('loginOverlay').classList.add('hidden');
            loadAllData();
            startAutoRefresh();
        } else { errEl.textContent = '认证失败，请重试'; }
    } catch (e) { errEl.textContent = '网络错误: ' + e.message; }
}

// === API 调取 ===
async function loadAllData() {
    if (isLoading) return;
    isLoading = true;
    const btn = document.getElementById('btnRefresh');
    btn.disabled = true; btn.textContent = '⟳ LOADING...';
    try {
        const r = await fetch(API + '?action=get_all', { headers: { 'X-Auth': authToken } });
        const j = await r.json();
        if (j.success) {
            allData = j.data;
            document.getElementById('lastUpdate').textContent = '更新: ' + j.time;
            renderDetail();
        } else { showErr(j.msg || '加载失败'); }
    } catch (e) { showErr('网络错误: ' + e.message); }
    finally { isLoading = false; btn.disabled = false; btn.textContent = '⟳ REFRESH'; }
}

async function resetTraffic(srv, id, email) {
    if (!confirm('确认重置 ' + email + ' 的流量数据？')) return;
    try {
        const url = `${API}?action=reset_traffic&server=${srv}&id=${id}&email=${encodeURIComponent(email)}`;
        const r = await fetch(url, { headers: { 'X-Auth': authToken } });
        const j = await r.json();
        alert(j.success ? '✅ 重置成功' : '❌ 失败: ' + (j.msg || ''));
        if (j.success) loadAllData();
    } catch (e) { alert('请求失败: ' + e.message); }
}

// === 订阅链接 ===
function showSubLink() {
    const url = location.origin + location.pathname + 'api/sub.php?token=' + authToken;
    const btn = document.getElementById('btnSub');
    navigator.clipboard.writeText(url).then(() => {
        btn.textContent = '✅ 已复制'; btn.style.borderColor = 'var(--green)';
        setTimeout(() => { btn.textContent = '📋 订阅'; btn.style.borderColor = ''; }, 2500);
    }).catch(() => prompt('订阅链接（请手动复制）:', url));
}

// === 工具函数 ===
function fmt(b) {
    if (!b || b <= 0) return '0 B';
    const u = ['B','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(2) + ' ' + u[i];
}
function fmtUp(s) {
    if (!s) return '--';
    const d = Math.floor(s/86400), h = Math.floor(s%86400/3600), m = Math.floor(s%3600/60);
    return d > 0 ? d+'d '+h+'h' : h+'h '+m+'m';
}
function pct(used, total) { return (!total || total<=0) ? -1 : Math.min(100, used/total*100); }
function pctCls(p) { return p>80 ? 'high' : p>50 ? 'mid' : 'low'; }
function showErr(msg) { document.getElementById('tableContainer').innerHTML = '<div class="error-msg">'+msg+'</div>'; }



// === 渲染详情面板 ===
function renderDetail() {
    const c = document.getElementById('tableContainer');
    // 第一遍：计算所有入站的流量，确定最大值作为 100% 基准
    let maxTraffic = 0;
    const colorMap = { hk: '0,255,65', hk1: '0,255,150', sg: '0,255,255', us: '255,0,255' };
    for (const [k, srv] of Object.entries(allData)) {
        (srv.inbounds || []).forEach(ib => {
            const total = (ib.up||0) + (ib.down||0);
            let clientTotal = 0;
            (ib.clientStats||[]).forEach(st => { clientTotal += (st.up||0) + (st.down||0); });
            maxTraffic = Math.max(maxTraffic, total, clientTotal);
        });
    }
    // 第二遍：渲染
    let h = '';
    for (const [k, srv] of Object.entries(allData)) {
        if (activeTab !== 'all' && activeTab !== k) continue;
        const ibs = srv.inbounds || [];
        if (!ibs.length) { h += `<div class="empty-state">${srv.flag} ${srv.name} - 暂无入站数据</div>`; continue; }
        const onlines = srv.onlines || [];
        h += `<div class="server-group ${k}">`;
        h += `<div class="server-group-title"><span class="server-group-flag">${srv.flag} ${srv.name}</span>`;
        h += `<span class="server-group-meta">${ibs.length} 入站 | ${onlines.length} 在线</span></div>`;
        ibs.forEach(ib => {
            const proto = (ib.protocol||'?').toUpperCase();
            const remark = ib.remark || 'Inbound #'+ib.id;
            let clients = [];
            try { clients = JSON.parse(ib.settings||'{}').clients||[]; } catch(e){}
            const stats = ib.clientStats || [];
            // 计算该入站的流量比例条宽度
            const ibTotal = (ib.up||0) + (ib.down||0);
            let clientSum = 0;
            stats.forEach(st => { clientSum += (st.up||0) + (st.down||0); });
            const trafficVal = Math.max(ibTotal, clientSum);
            const barPct = maxTraffic > 0 ? Math.min(100, (trafficVal / maxTraffic * 50)).toFixed(1) : 0;
            const rgb = colorMap[k] || '0,255,255';
            const barStyle = `background:linear-gradient(90deg,rgba(${rgb},.15) ${barPct}%,transparent ${barPct}%)`;
            h += `<div class="inbound-block"><div class="inbound-header" style="${barStyle}"><div>
                <span class="inbound-title">${remark}</span>
                <span class="inbound-traffic-label">${fmt(trafficVal)}</span></div>
                <span class="inbound-meta">${proto} | Port ${ib.port||'--'} | ${ib.enable?'<span style="color:var(--green)">启用</span>':'<span style="color:var(--red)">禁用</span>'}</span></div>`;
            if (clients.length) {
                h += `<div class="client-grid">`;
                clients.forEach(cl => {
                    const st = stats.find(s => s.email === cl.email) || {};
                    const up = st.up||0, dn = st.down||0, used = up+dn;
                    const total = st.total||0;
                    const p = pct(used, total);
                    const en = st.enable !== false;
                    const expiry = fmtExpiry(cl.expiryTime || st.expiryTime);
                    const safeEmail = (cl.email||'').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    
                    h += `<div class="client-card ${!en?'disabled':''}">
                        <div class="client-header">
                            <span class="client-email">${cl.email||cl.id||'--'}</span>
                            <span class="status-dot ${en?'online':'offline'}"></span>
                        </div>
                        <div class="client-usage-box">
                            <div class="usage-numbers">
                                <span>↑ ${fmt(up)}</span>
                                <span>↓ ${fmt(dn)}</span>
                            </div>
                            <div class="usage-bar-total">
                                <div class="usage-bar-inner ${pctCls(p)}" style="width:${p>=0?p.toFixed(1):0}%"></div>
                            </div>
                            <div class="usage-detail">
                                <span>已用: ${fmt(used)}</span>
                                <span>总量: ${total > 0 ? fmt(total) : '∞'}</span>
                            </div>
                        </div>
                        <div class="client-footer">
                            <span class="client-expiry">${expiry}</span>
                            <button class="btn-sm" onclick="resetTraffic('${k}',${ib.id},'${safeEmail}')">重置</button>
                        </div>
                    </div>`;
                });
                h += '</div>';
            } else {
                // 无命名客户端的入站
                const ibUp = ib.up||0, ibDn = ib.down||0;
                h += `<div class="client-grid">
                    <div class="client-card" style="border-left-color:var(--cyan)">
                        <div class="client-header">
                            <span class="client-email" style="color:var(--cyan)">${proto} Inbound Profile</span>
                            <span class="status-dot online"></span>
                        </div>
                        <div class="client-usage-box">
                            <div class="usage-numbers">
                                <span>↑ ${fmt(ibUp)}</span>
                                <span>↓ ${fmt(ibDn)}</span>
                            </div>
                            <div class="usage-bar-total">
                                <div class="usage-bar-inner low" style="width:100%"></div>
                            </div>
                            <div class="usage-detail">
                                <span>实时流量统计</span>
                                <span>${(ibUp+ibDn)>0 ? '● ACTIVE' : '○ IDLE'}</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            }
            h += '</div>';
        });
        h += '</div>'; // 关闭 server-group
    }
    c.innerHTML = h || '<div class="empty-state">暂无数据</div>';
}

function fmtExpiry(ts) {
    if (!ts || ts <= 0) return '<span style="color:var(--green)">永久</span>';
    const d = new Date(ts), now = Date.now(), diff = d.getTime() - now;
    if (diff < 0) return '<span style="color:var(--red)">已过期</span>';
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `<span style="color:var(--yellow)">${days}天</span>`;
    return d.toLocaleDateString('zh-CN');
}

// === Tab 切换 ===
function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.server === tab));
    // 仅在全部显示模式下开启 2x2 网格
    const container = document.getElementById('tableContainer');
    if (tab === 'all') {
        container.classList.add('grid-mode');
    } else {
        container.classList.remove('grid-mode');
    }
    if (allData) renderDetail();
}

// === 自动刷新 ===
function startAutoRefresh() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        if (document.getElementById('autoRefresh').checked) loadAllData();
    }, REFRESH_MS);
}

// === 回车登录 ===
document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
document.getElementById('loginUser').addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('loginPass').focus(); });

// === 启动 ===
checkAuth();



// ============================================================
// === 测速模块 v4 - 全自动：PHP代理 + postMessage 桥接 ===
// ============================================================
const SPEED_SERVERS = [
    { key: 'hk',  name: 'Hong Kong',    flag: '🇭🇰', host: 'hk.liukun.com',  color: '#00ff41' },
    { key: 'hk1', name: 'Hong Kong 1',  flag: '🇭🇰', host: 'hk1.liukun.com', color: '#00ff96' },
    { key: 'sg',  name: 'Singapore',    flag: '🇸🇬', host: 'sg.liukun.com',  color: '#00ffff' },
    { key: 'us',  name: 'United States',flag: '🇺🇸', host: 'us.liukun.com',  color: '#ff00ff' },
];
const SPEED_PORT = 8989;
let speedResults = {}, speedTestRunning = false;

// === 面板开关 ===
function toggleSpeedPanel() {
    const panel = document.getElementById('speedPanel');
    const btn = document.getElementById('btnSpeedTest');
    const v = panel.classList.toggle('visible');
    btn.classList.toggle('active', v);
    if (v) { renderSpeedQueue(); if (Object.keys(speedResults).length > 0) renderSpeedChart(); }
}

// === 渲染队列卡片 ===
function renderSpeedQueue() {
    const c = document.getElementById('speedQueue');
    let h = '';
    SPEED_SERVERS.forEach((srv, idx) => {
        const r = speedResults[srv.key] || {};
        const st = r.status || 'waiting';
        const labels = {waiting:'等待中',testing:'● 测速中',done:'✓ 完成',error:'✕ 超时'};
        const fmt = (v, unit) => v != null ? v + `<span class="queue-result-unit">${unit}</span>` : '--';
        h += `<div class="speed-queue-item ${st}" data-server="${srv.key}" onclick="startSingleTest(${idx})">
            <div class="queue-item-header">
                <span class="queue-item-flag">${srv.flag}</span>
                <span class="queue-item-status ${st}">${labels[st]||st}</span>
            </div>
            <div class="queue-item-name">${srv.name}</div>
            ${r.liveInfo ? `<div class="queue-live-speed">${r.liveInfo}</div>` : ''}
            <div class="queue-item-results">
                <div class="queue-result-cell">
                    <div class="queue-result-label">↓ 下载</div>
                    <div class="queue-result-value ${r.download!=null?'has-data download':''}">${fmt(r.download!=null?r.download.toFixed(1):null,'Mbps')}</div>
                </div>
                <div class="queue-result-cell">
                    <div class="queue-result-label">↑ 上传</div>
                    <div class="queue-result-value ${r.upload!=null?'has-data upload':''}">${fmt(r.upload!=null?r.upload.toFixed(1):null,'Mbps')}</div>
                </div>
                <div class="queue-result-cell">
                    <div class="queue-result-label">Ping</div>
                    <div class="queue-result-value ${r.ping!=null?'has-data ping':''}">${fmt(r.ping,'ms')}</div>
                </div>
                <div class="queue-result-cell">
                    <div class="queue-result-label">Jitter</div>
                    <div class="queue-result-value ${r.jitter!=null?'has-data jitter':''}">${fmt(r.jitter,'ms')}</div>
                </div>
            </div>
        </div>`;
    });
    c.innerHTML = h;
}

// === 单台服务器全自动测速 ===
function testOneServer(srv) {
    return new Promise((resolve) => {
        speedResults[srv.key] = { status: 'testing', download: null, upload: null, ping: null, jitter: null, liveInfo: '加载中...' };
        renderSpeedQueue();

        // 通过 PHP 代理加载 OpenSpeedTest（同源，可 postMessage）
        const iframeUrl = `api/speedtest.php?server=${srv.key}&run=1&t=${Date.now()}`;
        const container = document.getElementById('speedIframeContainer');
        container.innerHTML = `
            <div class="speed-iframe-label">
                <span class="testing-dot"></span>
                <span>${srv.flag} ${srv.name} — 自动测速中，请等待...</span>
            </div>
            <iframe id="speedIframe" src="${iframeUrl}"></iframe>`;

        let lastResult = null;
        let doneTimer = null;
        let resolved = false;

        // 监听 postMessage（桥接脚本发送的结果）
        function onMessage(e) {
            if (!e.data || e.data.type !== 'openspeedtest-result') return;
            const d = e.data;
            lastResult = d;

            // 实时更新队列卡片
            speedResults[srv.key].liveInfo = `↓ ${d.download||'--'} ↑ ${d.upload||'--'} Ping:${d.ping||'--'}`;
            if (d.download > 0) speedResults[srv.key].download = d.download;
            if (d.upload > 0) speedResults[srv.key].upload = d.upload;
            if (d.ping > 0) speedResults[srv.key].ping = d.ping;
            if (d.jitter > 0) speedResults[srv.key].jitter = d.jitter;
            renderSpeedQueue();

            // 更新仪表盘区域标签
            const label = container.querySelector('.speed-iframe-label span:last-child');
            if (label) {
                if (d.status === 'All done') {
                    label.textContent = `${srv.flag} ${srv.name} — ✅ 测速完成`;
                } else {
                    label.textContent = `${srv.flag} ${srv.name} — ${d.status || '测速中...'}`;
                }
            }

            // "All done" 表示 OpenSpeedTest 完成
            if (d.status === 'All done' && d.download > 0) {
                // 等 1.5 秒确保最终结果已写入，如果定时器已经启动则不要重置，否则永远无法触发
                if (!doneTimer) {
                    doneTimer = setTimeout(() => finish(true), 1500);
                }
            }
        }

        // 超时保护：90 秒后强制结束
        const timeout = setTimeout(() => {
            if (!resolved) finish(lastResult && lastResult.download > 0);
        }, 90000);

        function finish(success) {
            if (resolved) return;
            resolved = true;
            window.removeEventListener('message', onMessage);
            clearTimeout(timeout);
            if (doneTimer) clearTimeout(doneTimer);

            if (success && lastResult) {
                speedResults[srv.key] = {
                    status: 'done',
                    download: lastResult.download || null,
                    upload: lastResult.upload || null,
                    ping: lastResult.ping || null,
                    jitter: lastResult.jitter || null,
                    liveInfo: null,
                    timestamp: Date.now()
                };
            } else {
                speedResults[srv.key].status = 'error';
                speedResults[srv.key].liveInfo = null;
            }
            renderSpeedQueue();
            resolve();
        }

        window.addEventListener('message', onMessage);
    });
}

// === 全部顺序测速 ===
async function startSequentialTest() {
    if (speedTestRunning) return;
    speedTestRunning = true;
    const btn = document.getElementById('btnStartAll');
    btn.disabled = true; btn.classList.add('testing'); btn.textContent = '⏳ 测速中...';
    speedResults = {}; renderSpeedQueue(); updateProgress(0, '准备开始...');

    for (let i = 0; i < SPEED_SERVERS.length; i++) {
        updateProgress((i / SPEED_SERVERS.length) * 100, `🚀 ${SPEED_SERVERS[i].flag} ${SPEED_SERVERS[i].name} (${i+1}/${SPEED_SERVERS.length})`);
        await testOneServer(SPEED_SERVERS[i]);
        updateProgress(((i + 1) / SPEED_SERVERS.length) * 100,
            speedResults[SPEED_SERVERS[i].key].status === 'done'
                ? `${SPEED_SERVERS[i].flag} ✓` : `${SPEED_SERVERS[i].flag} ✕`);
    }
    speedTestRunning = false;
    btn.disabled = false; btn.classList.remove('testing'); btn.textContent = '▶ 重新测速';
    updateProgress(100, '全部测速完成');
    document.getElementById('speedIframeContainer').innerHTML =
        '<div class="speed-iframe-placeholder"><div class="placeholder-icon">✅</div><p>全部测速完成 · 结果已记录</p></div>';
    renderSpeedChart();
}

// === 单台测速 ===
async function startSingleTest(idx) {
    if (speedTestRunning) return;
    speedTestRunning = true;
    const srv = SPEED_SERVERS[idx];
    const btn = document.getElementById('btnStartAll');
    btn.disabled = true; btn.classList.add('testing');
    updateProgress(50, `🚀 ${srv.flag} ${srv.name}`);
    await testOneServer(srv);
    speedTestRunning = false;
    btn.disabled = false; btn.classList.remove('testing'); btn.textContent = '▶ 开始全部测速';
    updateProgress(100, `${srv.flag} 完成`);
    document.getElementById('speedIframeContainer').innerHTML =
        '<div class="speed-iframe-placeholder"><div class="placeholder-icon">✅</div><p>测速完成</p></div>';
    if (Object.values(speedResults).some(r => r.status === 'done')) renderSpeedChart();
}

// === 进度条 ===
function updateProgress(pct, text) {
    const inner = document.getElementById('speedProgressInner');
    const label = document.getElementById('speedProgressText');
    if (inner) inner.style.width = pct + '%';
    if (label) label.textContent = text;
}

// === 可视化图表（含 Ping/Jitter） ===
function renderSpeedChart() {
    const container = document.getElementById('speedResults');
    const chart = document.getElementById('resultsChart');
    const valid = SPEED_SERVERS.filter(s => speedResults[s.key]?.status === 'done');
    if (!valid.length) { container.classList.remove('visible'); return; }

    let maxSpd = 1;
    valid.forEach(s => {
        const r = speedResults[s.key];
        maxSpd = Math.max(maxSpd, r.download || 0, r.upload || 0);
    });
    const mH = 130;
    let h = '';
    SPEED_SERVERS.forEach(srv => {
        const r = speedResults[srv.key];
        const ok = r?.status === 'done';
        const dl = ok ? (r.download||0) : 0, ul = ok ? (r.upload||0) : 0;
        const dlH = Math.max(4, (dl/maxSpd)*mH), ulH = Math.max(4, (ul/maxSpd)*mH);
        const pV = ok && r.ping != null ? r.ping : '--';
        const jV = ok && r.jitter != null ? r.jitter : '--';
        h += `<div class="result-bar-group" style="${!ok?'opacity:0.25':''}">
            <div class="result-bar-pair">
                <div class="result-bar-wrapper">
                    <span class="result-bar-value download">${ok?dl.toFixed(1):'--'}</span>
                    <div class="result-bar download" style="height:${ok?dlH:4}px"></div>
                    <span class="result-bar-label">下载</span>
                </div>
                <div class="result-bar-wrapper">
                    <span class="result-bar-value upload">${ok?ul.toFixed(1):'--'}</span>
                    <div class="result-bar upload" style="height:${ok?ulH:4}px"></div>
                    <span class="result-bar-label">上传</span>
                </div>
            </div>
            <div class="result-ping-row">
                <span class="ping-badge">🏓 ${pV}<small>${ok&&r.ping!=null?'ms':''}</small></span>
                <span class="jitter-badge">📊 ${jV}<small>${ok&&r.jitter!=null?'ms':''}</small></span>
            </div>
            <div class="result-server-name"><span class="result-server-flag">${srv.flag}</span>${srv.name}</div>
        </div>`;
    });
    chart.innerHTML = h;
    const old = container.querySelector('.results-legend');
    if (old) old.remove();
    chart.insertAdjacentHTML('afterend', `<div class="results-legend">
        <div class="legend-item"><span class="legend-dot download"></span>下载 (Mbps)</div>
        <div class="legend-item"><span class="legend-dot upload"></span>上传 (Mbps)</div>
        <div class="legend-item">🏓 Ping (ms)</div>
        <div class="legend-item">📊 Jitter (ms)</div>
    </div>`);
    container.classList.add('visible');
}
