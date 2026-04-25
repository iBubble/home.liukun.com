<?php
/**
 * OpenSpeedTest 代理 + postMessage 桥接 v5
 * 
 * 核心问题：OpenSpeedTest 通过 <object> 加载 SVG，然后用 contentDocument 替换为内联 SVG
 * contentDocument 要求同源，所以 SVG 也必须通过代理加载
 * 
 * 方案：不用 <base> 标签，直接替换所有资源 URL
 */
header('Cache-Control: no-store, no-cache');

$server = $_GET['server'] ?? '';
$path = $_GET['path'] ?? '';
$hosts = [
    'hk'  => 'hk.liukun.com',
    'hk1' => 'hk1.liukun.com',
    'sg'  => 'sg.liukun.com',
    'us'  => 'us.liukun.com',
];
if (!isset($hosts[$server])) { http_response_code(400); die('Invalid server'); }

$host = $hosts[$server];
$port = 8989;
$baseUrl = "https://{$host}:{$port}";
$proxyBase = "speedproxy.php?server={$server}&path=";

// 如果请求的是子资源（CSS/JS/SVG/图片），直接中继
if ($path !== '') {
    set_time_limit(120);
    $targetUrl = "{$baseUrl}/" . ltrim($path, '/');
    $params = $_GET;
    unset($params['server'], $params['path']);
    if ($params) $targetUrl .= '?' . http_build_query($params);
    
    $method = $_SERVER['REQUEST_METHOD'];
    header('Access-Control-Allow-Origin: *');
    header('Cache-Control: no-store');
    if ($method === 'OPTIONS') { http_response_code(204); exit; }
    
    $ch = curl_init($targetUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HEADERFUNCTION => function($ch, $header) {
            $len = strlen($header);
            $h = trim($header);
            if (!$h || stripos($h, 'HTTP/') === 0) return $len;
            $lower = strtolower($h);
            if (strpos($lower, 'transfer-encoding') === false &&
                strpos($lower, 'access-control') === false) {
                header($h);
            }
            return $len;
        },
        CURLOPT_WRITEFUNCTION => function($ch, $data) {
            echo $data;
            flush();
            return strlen($data);
        },
    ]);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
        if (isset($_SERVER['CONTENT_TYPE'])) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: ' . $_SERVER['CONTENT_TYPE']]);
        }
    }
    if ($method === 'HEAD') curl_setopt($ch, CURLOPT_NOBODY, true);
    while (ob_get_level()) ob_end_flush();
    curl_exec($ch);
    if (curl_errno($ch)) http_response_code(502);
    curl_close($ch);
    exit;
}

// === 主页面代理 ===
$ch = curl_init("{$baseUrl}/?Run");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_FOLLOWLOCATION => true,
]);
$html = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if (!$html || $code !== 200) { http_response_code(502); die("Fetch failed"); }

// 1. 替换所有静态资源路径为通过代理加载（不用 <base>，确保同源）
$html = str_replace('href="assets/', 'href="' . $proxyBase . 'assets/', $html);
$html = str_replace("href='assets/", "href='" . $proxyBase . 'assets/', $html);
$html = str_replace('src="assets/', 'src="' . $proxyBase . 'assets/', $html);
$html = str_replace("src='assets/", "src='" . $proxyBase . 'assets/', $html);
$html = str_replace('data="assets/', 'data="' . $proxyBase . 'assets/', $html);
$html = str_replace('content="assets/', 'content="' . $proxyBase . 'assets/', $html);
$html = str_replace("href=\"assets/", "href=\"" . $proxyBase . 'assets/', $html);

// 2. 注入 XHR 拦截器（在 <head> 的最前面）
$xhr_js = '<script>'
    . '(function(){'
    . '  var _open = XMLHttpRequest.prototype.open;'
    . '  XMLHttpRequest.prototype.open = function(method, url) {'
    . '    if (typeof url === "string" && !url.startsWith("http") && !url.startsWith("//") && !url.startsWith("data:")) {'
    . '      var path = url.replace(/^\\//, "");'
    . '      url = "speedtest.php?server=' . $server . '&path=" + encodeURIComponent(path);'
    . '    }'
    . '    return _open.apply(this, [method, url].concat([].slice.call(arguments, 2)));'
    . '  };'
    . '})();'
    . '</script>';
$html = str_replace('<head>', '<head>' . "\n" . $xhr_js, $html);

// 3. 注入 postMessage 桥接脚本（在 </body> 之前）
// 因为 SVG 现在同源，contentDocument 可访问，且 OpenSpeedTest 会将 SVG 内联化
// 所以直接监听 DOM 中的结果元素
$bridge_js = '<script>'
    . 'var _ostInterval = setInterval(function() {'
    . '  try {'
    . '    var dl = document.getElementById("downResult");'
    . '    var ul = document.getElementById("upRestxt");'
    . '    var pg = document.getElementById("pingResult");'
    . '    var jt = document.getElementById("jitterDesk");'
    . '    var st = document.getElementById("oDoLiveStatus");'
    . '    if (!dl) return;'  // SVG 还没内联化
    . '    var data = {'
    . '      type: "openspeedtest-result",'
    . '      download: parseFloat(dl.textContent) || 0,'
    . '      upload: parseFloat(ul ? ul.textContent : "") || 0,'
    . '      ping: parseFloat(pg ? pg.textContent : "") || 0,'
    . '      jitter: parseFloat(jt ? jt.textContent : "") || 0,'
    . '      status: st ? st.textContent.trim() : ""'
    . '    };'
    . '    window.parent.postMessage(data, "*");'
    . '  } catch(e) {}'
    . '}, 600);'
    . '</script>';
$html = str_replace('</body>', $bridge_js . "\n" . '</body>', $html);

header('Content-Type: text/html; charset=UTF-8');
echo $html;
