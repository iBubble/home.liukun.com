<?php
// 3x-ui Dashboard API 代理
// 统一入口：登录、数据拉取、流量重置
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

$action = $_GET['action'] ?? '';

// 鉴权验证
function checkAuth() {
    $auth = $_SERVER['HTTP_X_AUTH'] ?? '';
    if (!$auth) return false;
    $expected = base64_encode(DASH_USER . ':' . DASH_PASS);
    return $auth === $expected;
}

// 调用 3x-ui 面板 API
$sessDir = sys_get_temp_dir() . '/3xui_sess/';
if (!is_dir($sessDir)) mkdir($sessDir, 0700, true);
function cookieFile($host) { global $sessDir; return $sessDir . md5($host) . '.txt'; }

function apiCall($server, $path, $postData = null) {
    $url = "https://{$server['host']}:{$server['port']}{$server['basePath']}{$path}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_COOKIEFILE     => cookieFile($server['host']),
        CURLOPT_COOKIEJAR      => cookieFile($server['host']),
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    if ($postData !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($postData) ? http_build_query($postData) : $postData);
    }
    $result = curl_exec($ch);
    curl_close($ch);
    return json_decode($result, true) ?: [];
}

// 登录到指定服务器
function loginServer($server) {
    return apiCall($server, 'login', [
        'username' => $server['username'],
        'password' => $server['password']
    ]);
}

// === 路由分发 ===
switch ($action) {
    case 'login':
        $input = json_decode(file_get_contents('php://input'), true);
        $u = $input['username'] ?? '';
        $p = $input['password'] ?? '';
        if ($u === DASH_USER && $p === DASH_PASS) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'msg' => '用户名或密码错误']);
        }
        break;

    case 'get_all':
        if (!checkAuth()) { echo json_encode(['success' => false, 'msg' => '未授权']); break; }
        $data = [];
        foreach (SERVERS as $key => $srv) {
            loginServer($srv);
            $inbounds = apiCall($srv, 'panel/api/inbounds/list');
            $sysStatus = apiCall($srv, 'server/status');
            $data[$key] = [
                'name'      => $srv['name'],
                'flag'      => $srv['flag'],
                'host'      => $srv['host'],
                'online'    => ($inbounds['success'] ?? false),
                'inbounds'  => $inbounds['obj'] ?? [],
                'status'    => $sysStatus['obj'] ?? null,
            ];
        }
        echo json_encode([
            'success' => true,
            'data'    => $data,
            'time'    => date('H:i:s')
        ]);
        break;

    case 'reset_traffic':
        if (!checkAuth()) { echo json_encode(['success' => false, 'msg' => '未授权']); break; }
        $srvKey = $_GET['server'] ?? '';
        $id = $_GET['id'] ?? '';
        $email = $_GET['email'] ?? '';
        if (!isset(SERVERS[$srvKey]) || !$id) {
            echo json_encode(['success' => false, 'msg' => '参数错误']);
            break;
        }
        $srv = SERVERS[$srvKey];
        loginServer($srv);
        $result = apiCall($srv, "panel/api/inbounds/resetClientTraffic/{$id}/{$email}");
        echo json_encode(['success' => $result['success'] ?? false, 'msg' => $result['msg'] ?? '']);
        break;

    default:
        echo json_encode(['success' => false, 'msg' => '未知操作: ' . $action]);
}
