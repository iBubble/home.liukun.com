// Linux.do 浏览器桥接抓取脚本
// 在 Firefox 控制台中通过 fetch 加载执行
(async () => {
    const API = 'http://192.168.1.40:3000/api/browser_import';
    const allNodes = [];
    const allSubs = [];
    const allBase64 = [];

    console.log('📋 获取帖子列表...');
    let topics = [];
    for (let page = 0; page < 5; page++) {
        const url = page === 0 ? '/tag/订阅节点.json' : `/tag/订阅节点.json?page=${page}`;
        try {
            const r = await fetch(url, { credentials: 'include' });
            const d = await r.json();
            const t = d.topic_list?.topics || [];
            if (t.length === 0) break;
            topics = topics.concat(t);
            console.log(`  第${page + 1}页: ${t.length} 个帖子`);
        } catch (e) { console.log(`  第${page + 1}页失败:`, e); break; }
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`📊 共 ${topics.length} 个帖子`);

    for (let i = 0; i < topics.length; i++) {
        const t = topics[i];
        try {
            console.log(`[${i + 1}/${topics.length}] ${t.title.substring(0, 30)}...`);
            const r = await fetch(`/t/topic/${t.id}.json`, { credentials: 'include' });
            const d = await r.json();
            if (d.errors) { console.log('  ❌ 无权限'); continue; }

            const posts = d.post_stream?.posts || [];
            for (const p of posts.slice(0, 15)) {
                const c = p.cooked || '';
                const text = c.replace(/<[^>]+>/g, '\n');

                (text.match(/vmess:\/\/[A-Za-z0-9+=\/]+/g) || []).forEach(n => allNodes.push(n));
                (text.match(/vless:\/\/[^\s\n]+/g) || []).forEach(n => allNodes.push(n));
                (text.match(/trojan:\/\/[^\s\n]+/g) || []).forEach(n => allNodes.push(n));
                (text.match(/ss:\/\/[A-Za-z0-9+=\/@.:?&#\-]+/g) || []).forEach(n => allNodes.push(n));
                (text.match(/ssr:\/\/[A-Za-z0-9+=\/_-]+/g) || []).forEach(n => allNodes.push(n));
                (text.match(/hysteria2?:\/\/[^\s\n]+/g) || []).forEach(n => allNodes.push(n));
                (text.match(/hy2:\/\/[^\s\n]+/g) || []).forEach(n => allNodes.push(n));
                (text.match(/tuic:\/\/[^\s\n]+/g) || []).forEach(n => allNodes.push(n));

                (text.match(/https?:\/\/[^\s\n]+(?:sub|subscribe|clash|api\/v1|link)[^\s\n]*/gi) || []).forEach(s => {
                    if (!s.includes('linux.do') && !s.includes('github.com') && s.length < 500) allSubs.push(s);
                });

                const b64matches = text.match(/[A-Za-z0-9+\/=]{100,}/g) || [];
                b64matches.forEach(b => {
                    try { const d = atob(b); if (d.includes('://')) allBase64.push(b); } catch (e) { }
                });
            }
        } catch (e) { console.log('  ❌', e.message); }
        await new Promise(r => setTimeout(r, 1500));
    }

    const uniqueNodes = [...new Set(allNodes)];
    const uniqueSubs = [...new Set(allSubs)];
    console.log(`\n🎯 结果: ${uniqueNodes.length} 节点, ${uniqueSubs.length} 订阅, ${allBase64.length} Base64块`);

    console.log('📤 发送到 Aggregator...');
    try {
        const resp = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes: uniqueNodes, subscriptions: uniqueSubs, base64Content: allBase64.join('\n') })
        });
        const result = await resp.json();
        console.log('✅ 发送成功:', result);
    } catch (e) {
        console.error('❌ 发送失败:', e);
    }
})();
