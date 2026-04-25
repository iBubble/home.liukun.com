<?php
// Clash 订阅生成器 - 自动从所有服务器拉取 VLESS 配置生成统一订阅
require_once __DIR__ . '/config.php';

$token = $_GET['token'] ?? '';
if ($token !== base64_encode(DASH_USER . ':' . DASH_PASS)) {
    http_response_code(403); die('Forbidden');
}

$sessDir = sys_get_temp_dir() . '/3xui_sess/';
if (!is_dir($sessDir)) mkdir($sessDir, 0700, true);
function cf($h) { global $sessDir; return $sessDir . md5($h) . '.txt'; }

function api($s, $p, $d = null) {
    $ch = curl_init("https://{$s['host']}:{$s['port']}{$s['basePath']}{$p}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => false, CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_COOKIEFILE => cf($s['host']), CURLOPT_COOKIEJAR => cf($s['host']),
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    if ($d !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($d) ? http_build_query($d) : $d);
    }
    $r = curl_exec($ch); curl_close($ch);
    return json_decode($r, true) ?: [];
}

// 从所有服务器收集 VLESS 入站配置
$proxies = [];
$names = [];
foreach (SERVERS as $key => $srv) {
    api($srv, 'login', ['username' => $srv['username'], 'password' => $srv['password']]);
    $res = api($srv, 'panel/api/inbounds/list');
    if (!($res['success'] ?? false)) continue;
    foreach ($res['obj'] as $ib) {
        if ($ib['protocol'] !== 'vless') continue;
        $cfg = json_decode($ib['settings'] ?? '{}', true);
        $stm = json_decode($ib['streamSettings'] ?? '{}', true);
        $cl = $cfg['clients'][0] ?? null;
        if (!$cl) continue;
        $reality = $stm['realitySettings'] ?? [];
        $realityClient = $reality['settings'] ?? [];
        $name = 'Gemini-' . strtoupper($key);
        $names[] = $name;
        $proxies[] = [
            'name' => $name, 'server' => $srv['host'], 'port' => $ib['port'],
            'uuid' => $cl['id'], 'flow' => $cl['flow'] ?? '',
            'network' => $stm['network'] ?? 'tcp',
            'sni' => $reality['serverNames'][0] ?? '',
            'pubkey' => $realityClient['publicKey'] ?? $reality['publicKey'] ?? '',
            'shortid' => $reality['shortIds'][0] ?? '',
        ];
    }
}

// 生成 Clash YAML
header('Content-Type: text/yaml; charset=utf-8');
header('Content-Disposition: inline; filename="clash-sub.yaml"');

$y = "# Gemini Clash Subscription - Auto Generated\n";
$y .= "# Updated: " . date('Y-m-d H:i:s') . "\n\n";
$y .= "mixed-port: 7890\nallow-lan: false\nmode: rule\nlog-level: info\n\n";
$y .= "proxies:\n";
foreach ($proxies as $p) {
    $y .= "  - name: \"{$p['name']}\"\n    type: vless\n";
    $y .= "    server: {$p['server']}\n    port: {$p['port']}\n";
    $y .= "    uuid: {$p['uuid']}\n    cipher: auto\n";
    $y .= "    network: {$p['network']}\n    tls: true\n    udp: true\n";
    if ($p['flow']) $y .= "    flow: {$p['flow']}\n";
    if ($p['sni']) $y .= "    servername: {$p['sni']}\n";
    $y .= "    client-fingerprint: chrome\n";
    if ($p['pubkey']) {
        $y .= "    reality-opts:\n";
        $y .= "      public-key: {$p['pubkey']}\n";
        $y .= "      short-id: {$p['shortid']}\n";
    }
    $y .= "\n";
}

$y .= "proxy-groups:\n  - name: \"Proxy\"\n    type: select\n    proxies:\n";
foreach ($names as $n) $y .= "      - \"{$n}\"\n";
$y .= "      - DIRECT\n\n";

echo $y;
echo <<<'RULES'
rules:
  - DOMAIN-SUFFIX,cn,DIRECT
  - DOMAIN-SUFFIX,baidu.com,DIRECT
  - DOMAIN-SUFFIX,taobao.com,DIRECT
  - DOMAIN-SUFFIX,qq.com,DIRECT
  - DOMAIN-SUFFIX,163.com,DIRECT
  - DOMAIN-SUFFIX,jd.com,DIRECT
  - DOMAIN-SUFFIX,google.com,Proxy
  - DOMAIN-SUFFIX,github.com,Proxy
  - DOMAIN-SUFFIX,youtube.com,Proxy
  - DOMAIN-SUFFIX,openai.com,Proxy
  - DOMAIN-KEYWORD,microsoft,Proxy
  - DOMAIN-SUFFIX,copilot.microsoft.com,Proxy
  - DOMAIN-SUFFIX,bing.com,Proxy
  - DOMAIN-SUFFIX,duosecurity.com,Proxy
  - DOMAIN-SUFFIX,antigravity.google,Proxy
  - DOMAIN-SUFFIX,generativelanguage.googleapis.com,Proxy
  - DOMAIN-KEYWORD,gemini,Proxy
  - DOMAIN-SUFFIX,googleapis.com,Proxy
  - DOMAIN-SUFFIX,googleusercontent.com,Proxy
  - DOMAIN-SUFFIX,antigravity-unleash.goog,Proxy
  - DOMAIN-SUFFIX,run.app,Proxy
  - DOMAIN-SUFFIX,open-vsx.org,Proxy
  - IP-CIDR,192.168.0.0/16,DIRECT
  - IP-CIDR,10.0.0.0/8,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT
  - GEOIP,CN,DIRECT
  - GEOIP,PRIVATE,DIRECT
  - MATCH,Proxy
RULES;
echo "\n";
