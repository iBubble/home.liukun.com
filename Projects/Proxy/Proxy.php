<?php
session_start();
// Proxy检测页面：表单 + 后端检测逻辑
// 使用说明：选择代理类型、填写地址与端口（可选用户名/密码），点击“检测”查看结果。

function h($s) {
	return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function testProxyWithCurl($type, $host, $port, $user = '', $pass = '', $testUrl = 'http://httpbin.org/ip') {
	if (!function_exists('curl_version')) {
		return array('ok' => false, 'reason' => 'cURL not available');
	}

	$ch = curl_init();
	// 构造代理字符串：对 SOCKS5 使用 socks5h:// 以确保代理端解析域名
	if (strtolower($type) === 'socks5') {
		$authPart = '';
		if ($user !== '' || $pass !== '') {
			$authPart = rawurlencode($user) . ':' . rawurlencode($pass) . '@';
		}
		$proxy = 'socks5h://' . $authPart . $host . ':' . $port;
		curl_setopt($ch, CURLOPT_PROXY, $proxy);
	} else {
		$proxy = $host . ':' . $port;
		curl_setopt($ch, CURLOPT_PROXY, $proxy);
	}

	// 使用一个简单的 HTTP 测试 URL（返回源 IP）

	curl_setopt($ch, CURLOPT_URL, $testUrl);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_HEADER, false);
	curl_setopt($ch, CURLOPT_TIMEOUT, 10);
	curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 6);

	curl_setopt($ch, CURLOPT_PROXY, $proxy);

	// 代理类型映射
	switch (strtolower($type)) {
		case 'http':
			$ptype = defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0;
			break;
		case 'https':
			$ptype = defined('CURLPROXY_HTTPS') ? CURLPROXY_HTTPS : (defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0);
			break;
		case 'socks5':
			// Prefer the HOSTNAME variant so DNS resolution happens on proxy side if available
			if (defined('CURLPROXY_SOCKS5_HOSTNAME')) $ptype = CURLPROXY_SOCKS5_HOSTNAME;
			else $ptype = defined('CURLPROXY_SOCKS5') ? CURLPROXY_SOCKS5 : 7;
			break;
		default:
			$ptype = defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0;
	}

	// 如果使用 socks5h 已经在 proxy URL 中包含了用户信息；否则设置 proxytype 与用户密码
	if (strtolower($type) !== 'socks5') {
		curl_setopt($ch, CURLOPT_PROXYTYPE, $ptype);
		if ($user !== '' || $pass !== '') {
			curl_setopt($ch, CURLOPT_PROXYUSERPWD, $user . ':' . $pass);
		}
	} else {
		// 对于 socks5，若常量可用，也设置类型为 SOCKS5
		if (defined('CURLPROXY_SOCKS5') && !defined('CURLPROXY_SOCKS5_HOSTNAME')) {
			curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_SOCKS5);
		}
	}

	// 在测试时禁用 SSL 验证以避免因为证书问题导致误判（仅用于检测）
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

	$t0 = microtime(true);
	$resp = curl_exec($ch);
	$t1 = microtime(true);

	$errno = curl_errno($ch);
	$errstr = curl_error($ch);
	$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

	curl_close($ch);

	$ok = ($errno === 0 && $http_code >= 200 && $http_code < 400 && strlen($resp) > 0);

	return array(
		'ok' => $ok,
		'errno' => $errno,
		'error' => $errstr,
		'http_code' => $http_code,
		'time' => round($t1 - $t0, 3),
		'response_snippet' => $resp === false ? '' : mb_substr($resp, 0, 700),
	);
}

function resolveHost($host) {
	$res = array('ok' => false, 'addresses' => array());
	if (filter_var($host, FILTER_VALIDATE_IP)) {
		$res['ok'] = true;
		$res['addresses'][] = $host;
		return $res;
	}

	// 尝试 A/AAAA 记录
	if (function_exists('dns_get_record')) {
		$records = dns_get_record($host, DNS_A + DNS_AAAA);
		if ($records !== false && count($records) > 0) {
			foreach ($records as $r) {
				if (!empty($r['ip'])) $res['addresses'][] = $r['ip'];
				if (!empty($r['ipv6'])) $res['addresses'][] = $r['ipv6'];
			}
		}
	}

	// fallback to gethostbyname
	if (empty($res['addresses'])) {
		$ip = gethostbyname($host);
		if ($ip !== $host) {
			$res['addresses'][] = $ip;
		}
	}

	$res['ok'] = !empty($res['addresses']);
	return $res;
}

// Fetch via proxy: moved to top-level so visit and tests can call it.
function fetchViaProxy($type, $host, $port, $user, $pass, $targetUrl) {
	// 优先使用 cURL；若不可用，则尝试 stream/file_get_contents 或手工 CONNECT 回退（仅支持 HTTP/HTTPS）
	if (function_exists('curl_version')) {
		$ch = curl_init();
		// 构造代理字符串：对 SOCKS5 使用 socks5h:// 以确保代理端解析域名
		if (strtolower($type) === 'socks5') {
			$authPart = '';
			if ($user !== '' || $pass !== '') {
				$authPart = rawurlencode($user) . ':' . rawurlencode($pass) . '@';
			}
			$proxy = 'socks5h://' . $authPart . $host . ':' . $port;
			curl_setopt($ch, CURLOPT_PROXY, $proxy);
		} else {
			$proxy = $host . ':' . $port;
			curl_setopt($ch, CURLOPT_PROXY, $proxy);
		}
		curl_setopt($ch, CURLOPT_URL, $targetUrl);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HEADER, true);
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
		curl_setopt($ch, CURLOPT_TIMEOUT, 20);
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
		if (strtolower($type) !== 'socks5') {
			switch (strtolower($type)) {
				case 'http':
					$ptype = defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0; break;
				case 'https':
					$ptype = defined('CURLPROXY_HTTPS') ? CURLPROXY_HTTPS : (defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0); break;
				default:
					$ptype = defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0;
			}
			curl_setopt($ch, CURLOPT_PROXYTYPE, $ptype);
			if ($user !== '' || $pass !== '') {
				curl_setopt($ch, CURLOPT_PROXYUSERPWD, $user . ':' . $pass);
			}
		} else {
			if (defined('CURLPROXY_SOCKS5') && !defined('CURLPROXY_SOCKS5_HOSTNAME')) {
				curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_SOCKS5);
			}
		}
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
		$t0 = microtime(true);
		$raw = curl_exec($ch);
		$t1 = microtime(true);
		$errno = curl_errno($ch);
		$errstr = curl_error($ch);
		$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
		curl_close($ch);
		if ($raw === false) return array('ok' => false, 'errno' => $errno, 'error' => $errstr);
		$headers = substr($raw, 0, $header_size);
		$body = substr($raw, $header_size);
		return array('ok' => true, 'http_code' => $http_code, 'headers' => $headers, 'body' => $body, 'time' => round($t1-$t0,3));
	} else {
		// 回退实现（支持 HTTP 和 HTTPS）
		if (strtolower($type) === 'socks5') {
			return array('ok' => false, 'error' => 'SOCKS5 proxy requires cURL (fallback does not support SOCKS5)');
		}
		$u = parse_url($targetUrl);
		if ($u === false || !isset($u['scheme']) || !isset($u['host'])) {
			return array('ok' => false, 'error' => 'invalid target url');
		}
		$scheme = strtolower($u['scheme']);
		$path = isset($u['path']) ? $u['path'] : '/';
		if (isset($u['query'])) $path .= '?' . $u['query'];
		$targetHost = $u['host'];
		$targetPort = isset($u['port']) ? $u['port'] : ($scheme === 'https' ? 443 : 80);
		// 如果没有代理，直接使用 file_get_contents
		if (empty($host) || empty($port)) {
			$ctx = stream_context_create(['http' => ['method'=>'GET','timeout'=>20]]);
			$rawBody = @file_get_contents($targetUrl, false, $ctx);
			$headers = isset($http_response_header) ? implode("\r\n", $http_response_header) : '';
			if ($rawBody === false) return array('ok'=>false,'error'=>'fetch failed');
			return array('ok'=>true,'http_code'=>null,'headers'=>$headers,'body'=>$rawBody,'time'=>0);
		}
		$proxyAuthHeader = '';
		if ($user !== '' || $pass !== '') $proxyAuthHeader = 'Proxy-Authorization: Basic ' . base64_encode($user . ':' . $pass) . "\r\n";
		if ($scheme === 'http') {
			$opts = ['http' => [
				'method' => 'GET',
				'header' => $proxyAuthHeader . 'Connection: close\r\n',
				'proxy' => 'tcp://' . $host . ':' . $port,
				'request_fulluri' => true,
				'timeout' => 20
			]];
			$ctx = stream_context_create($opts);
			$rawBody = @file_get_contents($targetUrl, false, $ctx);
			$headers = isset($http_response_header) ? implode("\r\n", $http_response_header) : '';
			if ($rawBody === false) return array('ok'=>false,'error'=>'fetch failed via proxy');
			return array('ok'=>true,'http_code'=>null,'headers'=>$headers,'body'=>$rawBody,'time'=>0);
		} elseif ($scheme === 'https') {
			$errno = 0; $errstr = '';
			$fp = @stream_socket_client('tcp://' . $host . ':' . $port, $errno, $errstr, 10);
			if (!$fp) return array('ok'=>false,'error'=>'proxy connect failed','errno'=>$errno,'errstr'=>$errstr);
			$connectReq = "CONNECT $targetHost:$targetPort HTTP/1.1\r\nHost: $targetHost\r\n" . $proxyAuthHeader . "Connection: close\r\n\r\n";
			fwrite($fp, $connectReq);
			$resp = '';
			while (!feof($fp)) {
				$line = fgets($fp, 1024);
				$resp .= $line;
				if (rtrim($line) == '') break;
			}
			if (!preg_match('#^HTTP/\d\.\d\s+(\d{3})#mi', $resp, $m)) {
				fclose($fp);
				return array('ok'=>false,'error'=>'no connect response');
			}
			$code = (int)$m[1];
			if ($code !== 200) {
				fclose($fp);
				return array('ok'=>false,'error'=>'proxy CONNECT failed','http_code'=>$code,'resp'=>$resp);
			}
			stream_set_blocking($fp, true);
			$crypto = @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
			if ($crypto !== true) {
				fclose($fp);
				return array('ok'=>false,'error'=>'TLS handshake failed');
			}
			$out = "GET $path HTTP/1.1\r\nHost: $targetHost\r\nConnection: close\r\n\r\n";
			fwrite($fp, $out);
			$respBody = '';
			while (!feof($fp)) {
				$respBody .= fgets($fp, 1024);
			}
			fclose($fp);
			$parts = preg_split("/\r\n\r\n/", $respBody, 2);
			$headers = isset($parts[0]) ? $parts[0] : '';
			$body = isset($parts[1]) ? $parts[1] : '';
			return array('ok'=>true,'http_code'=>$code,'headers'=>$headers,'body'=>$body,'time'=>0);
		} else {
			return array('ok'=>false,'error'=>'unsupported scheme fallback');
		}
	}
}

function recordDetection($type, $host, $port, $user, $pass) {
	$_SESSION['proxy_detected'] = array(
		'type' => $type,
		'host' => $host,
		'port' => (int)$port,
		'user' => $user,
		'pass' => $pass,
		'ok' => true,
		'time' => time(),
	);
}

function tcpConnectCheck($host, $port, $timeout = 6) {
	$t0 = microtime(true);
	$errNo = 0; $errStr = '';
	$fp = @fsockopen($host, (int)$port, $errNo, $errStr, $timeout);
	$t1 = microtime(true);
	if ($fp) {
		fclose($fp);
		return array('ok' => true, 'errno' => 0, 'error' => '', 'time' => round($t1 - $t0, 3));
	}
	return array('ok' => false, 'errno' => $errNo, 'error' => $errStr, 'time' => round($t1 - $t0, 3));
}

function httpProxyProbe($host, $port, $user = '', $pass = '', $target = 'http://httpbin.org/ip', $timeout = 8) {
	$ret = array('ok' => false);
	$remote = $host . ':' . $port;
	$t0 = microtime(true);
	$fp = @fsockopen($host, (int)$port, $errno, $errstr, $timeout);
	$t1 = microtime(true);
	if (!$fp) {
		$ret['error_stage'] = 'tcp_connect';
		$ret['errno'] = $errno;
		$ret['error'] = $errstr;
		$ret['time'] = round($t1 - $t0, 3);
		return $ret;
	}

	stream_set_timeout($fp, $timeout);
	// 发送一个通过代理的 HTTP GET 请求（使用绝对 URL）
	$headers = "GET $target HTTP/1.1\r\n";
	// 从 target 提取 Host
	$u = parse_url($target);
	$hostHdr = isset($u['host']) ? $u['host'] : 'host';
	$headers .= "Host: $hostHdr\r\nConnection: close\r\n";
	if ($user !== '' || $pass !== '') {
		$auth = base64_encode($user . ':' . $pass);
		$headers .= "Proxy-Authorization: Basic $auth\r\n";
	}
	$headers .= "\r\n";

	fwrite($fp, $headers);
	$response = '';
	while (!feof($fp)) {
		$response .= fgets($fp, 1024);
		// limit read size
		if (strlen($response) > 8192) break;
	}
	fclose($fp);

	// 解析状态行
	if (preg_match('#^HTTP/\d\.\d\s+(\d{3})#mi', $response, $m)) {
		$status = (int)$m[1];
		$ret['http_status'] = $status;
		$ret['response_snippet'] = substr($response, 0, 2000);
		$ret['time'] = round(microtime(true) - $t0, 3);
		if ($status === 407) {
			$ret['error_stage'] = 'proxy_auth_required';
			$ret['ok'] = false;
		} else if ($status >= 200 && $status < 400) {
			$ret['ok'] = true;
		} else {
			$ret['error_stage'] = 'http_error';
			$ret['ok'] = false;
		}
	} else {
		$ret['error_stage'] = 'no_http_response';
		$ret['response_snippet'] = substr($response, 0, 2000);
		$ret['ok'] = false;
	}

	return $ret;
}

function socks5Probe($host, $port, $user = '', $pass = '', $targetHost = 'httpbin.org', $targetPort = 80, $timeout = 8) {
	$ret = array('ok' => false);
	$t0 = microtime(true);
	$fp = @fsockopen($host, (int)$port, $errno, $errstr, $timeout);
	if (!$fp) {
		$ret['error_stage'] = 'tcp_connect';
		$ret['errno'] = $errno;
		$ret['error'] = $errstr;
		$ret['time'] = round(microtime(true) - $t0, 3);
		return $ret;
	}
	stream_set_timeout($fp, $timeout);

	// SOCKS5 greeting
	$methods = array(0x00); // no auth
	if ($user !== '' || $pass !== '') $methods = array(0x02, 0x00); // prefer user/pass, then no auth
	$buf = chr(0x05) . chr(count($methods));
	foreach ($methods as $m) $buf .= chr($m);
	fwrite($fp, $buf);
	$resp = fread($fp, 2);
	if (strlen($resp) < 2) {
		fclose($fp);
		$ret['error_stage'] = 'no_socks5_greeting_response';
		return $ret;
	}
	$ver = ord($resp[0]);
	$method = ord($resp[1]);
	if ($ver !== 0x05) {
		fclose($fp);
		$ret['error_stage'] = 'invalid_socks5_version';
		return $ret;
	}
	if ($method === 0xFF) {
		fclose($fp);
		$ret['error_stage'] = 'no_acceptable_auth_method';
		return $ret;
	}

	// 如果需要用户名/密码验证
	if ($method === 0x02) {
		$u = $user;
		$p = $pass;
		$payload = chr(0x01) . chr(strlen($u)) . $u . chr(strlen($p)) . $p;
		fwrite($fp, $payload);
		$r = fread($fp, 2);
		if (strlen($r) < 2) {
			fclose($fp);
			$ret['error_stage'] = 'no_socks5_auth_response';
			return $ret;
		}
		$status = ord($r[1]);
		if ($status !== 0x00) {
			fclose($fp);
			$ret['error_stage'] = 'socks5_auth_failed';
			$ret['auth_status'] = $status;
			return $ret;
		}
	}

	// 请求连接到目标（使用用户提供的目标主机:port）
	// 使用域名形式（ATYP=0x03）以避免 IPv4/IPv6 二进制处理问题
	$req = chr(0x05) . chr(0x01) . chr(0x00) . chr(0x03) . chr(strlen($targetHost)) . $targetHost . pack('n', $targetPort);
	fwrite($fp, $req);
	$r = fread($fp, 10);
	if (strlen($r) < 2) {
		fclose($fp);
		$ret['error_stage'] = 'no_socks5_connect_response';
		return $ret;
	}
	$rep = ord($r[1]);
	if ($rep === 0x00) {
		$ret['ok'] = true;
		$ret['time'] = round(microtime(true) - $t0, 3);
	} else {
		$ret['error_stage'] = 'socks5_connect_failed';
		$ret['socks5_rep'] = $rep;
	}
	fclose($fp);
	return $ret;
}

$result = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$type   = isset($_POST['type'])   ? trim($_POST['type'])   : 'http';
	$host   = isset($_POST['host'])   ? trim($_POST['host'])   : '';
	$port   = isset($_POST['port'])   ? trim($_POST['port'])   : '';
	$user   = isset($_POST['user'])   ? trim($_POST['user'])   : '';
	$pass   = isset($_POST['pass'])   ? trim($_POST['pass'])   : '';
	$target = isset($_POST['target']) ? trim($_POST['target']) : 'http://httpbin.org/ip';

	// 验证目标 URL
	$target_ok    = false;
	$targetHost   = 'httpbin.org';
	$targetPort   = 80;
	$targetScheme = 'http';
	if (!empty($target)) {
		$u = parse_url($target);
		if ($u !== false && isset($u['scheme']) && isset($u['host']) && in_array(strtolower($u['scheme']), array('http','https'))) {
			$target_ok    = true;
			$targetHost   = $u['host'];
			$targetScheme = strtolower($u['scheme']);
			if (isset($u['port'])) {
				$targetPort = (int)$u['port'];
			} else {
				$targetPort = ($targetScheme === 'https') ? 443 : 80;
			}
		}
	}

	$visitResult = null;

	// 如果是点击【检测代理】，执行诊断流程
	if (isset($_POST['test_proxy'])) {
		if ($host === '' || $port === '') {
			$result = array('ok' => false, 'error' => '代理地址或端口不能为空');
		} elseif (!is_numeric($port) || (int)$port <= 0 || (int)$port > 65535) {
			$result = array('ok' => false, 'error' => '端口号无效');
		} else {
			// 逐步诊断：DNS -> TCP -> 协议级检测（HTTP 或 SOCKS5） -> 可选 cURL 功能测试
			$diag        = array();
			$diag['dns'] = resolveHost($host);
			if (!$diag['dns']['ok']) {
				$result = array('ok' => false, 'reason' => 'dns_failed', 'diag' => $diag);
			} else {
				$diag['tcp'] = tcpConnectCheck($host, (int)$port);
				if (!$diag['tcp']['ok']) {
					$result = array('ok' => false, 'reason' => 'tcp_connect_failed', 'diag' => $diag);
				} else {
					if (strtolower($type) === 'socks5') {
						$diag['socks5_probe'] = socks5Probe($host, (int)$port, $user, $pass, $targetHost, $targetPort);
						if (!empty($diag['socks5_probe']['ok'])) {
							$result = array('ok' => true, 'reason' => 'socks5_ok', 'diag' => $diag);
							// 存储检测成功到 session
							recordDetection($type, $host, $port, $user, $pass);
						} else {
							$result = array('ok' => false, 'reason' => 'socks5_failed', 'diag' => $diag);
						}
					} else {
						// HTTP/HTTPS proxy probe
						$diag['http_probe'] = httpProxyProbe($host, (int)$port, $user, $pass, $target);
						if (!empty($diag['http_probe']['ok'])) {
							$result = array('ok' => true, 'reason' => 'http_proxy_ok', 'diag' => $diag);
							// 存储检测成功到 session
							recordDetection($type, $host, $port, $user, $pass);
						} else {
							// 额外尝试使用 cURL 获取更详细错误信息
							$diag['curl'] = testProxyWithCurl($type, $host, (int)$port, $user, $pass, $target);
							$result       = array('ok' => false, 'reason' => 'http_proxy_failed', 'diag' => $diag);
						}
					}
				}
			}
		}
	}
}

// 连续测试：当前端以 AJAX 方式提交 continuous_api=1 时，仅返回简短 JSON 结果
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['continuous_api'])) {
    header('Content-Type: application/json; charset=utf-8');

    // $result 在上面的 POST 逻辑中已经根据 test_proxy 计算过
    $ok = !empty($result['ok']);
    $reason = isset($result['reason']) ? $result['reason'] : '';

    $latency = null;
    if (isset($result['diag']['http_probe']['time'])) {
        $latency = $result['diag']['http_probe']['time'];
    } elseif (isset($result['diag']['socks5_probe']['time'])) {
        $latency = $result['diag']['socks5_probe']['time'];
    } elseif (isset($result['diag']['tcp']['time'])) {
        $latency = $result['diag']['tcp']['time'];
    }

    // 日志记录：每次“连续测试”会把结果写入 logs/log_YYYYmmdd_HHMMSS.txt
    // 当收到 log_reset=1 时，为本次连续测试会话创建一个新的日志文件
    if (isset($_POST['log_reset']) && $_POST['log_reset'] === '1') {
        unset($_SESSION['current_log_file']);
    }
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0777, true);
    }
    if (!isset($_SESSION['current_log_file']) || !is_string($_SESSION['current_log_file']) || $_SESSION['current_log_file'] === '') {
        $_SESSION['current_log_file'] = 'log_' . date('Ymd_His') . '.txt';
    }
    $logFile = $logDir . '/' . $_SESSION['current_log_file'];
    $logLine = sprintf(
        "[%s] ok=%s latency=%s reason=%s\n",
        date('Y-m-d H:i:s'),
        $ok ? '1' : '0',
        $latency !== null ? sprintf('%.3f', $latency) : '-',
        str_replace(array("\r", "\n"), ' ', (string)$reason)
    );
    @file_put_contents($logFile, $logLine, FILE_APPEND);

    echo json_encode(array(
        'ok'      => $ok,
        'reason'  => $reason,
        'latency' => $latency,               // 单位：秒
        'time'    => date('Y-m-d H:i:s'),    // 当前服务器时间
    ), JSON_UNESCAPED_UNICODE);

    exit;
}

// 获取日志文件列表 API（包含故障百分比）
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_log_list') {
    header('Content-Type: application/json; charset=utf-8');
    $logDir = __DIR__ . '/logs';
    $files = array();
    if (is_dir($logDir)) {
        $items = scandir($logDir);
        foreach ($items as $item) {
            if ($item !== '.' && $item !== '..' && is_file($logDir . '/' . $item) && preg_match('/^log_\d{8}_\d{6}\.txt$/', $item)) {
                $logFile = $logDir . '/' . $item;
                $content = @file_get_contents($logFile);
                $failCount = 0;
                $totalCount = 0;
                $failPercent = 0;
                
                if ($content !== false) {
                    $lines = explode("\n", trim($content));
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if (empty($line)) continue;
                        
                        // 解析格式: [2025-12-02 14:30:01] ok=1 latency=0.123 reason=http_proxy_ok
                        if (preg_match('/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+ok=([01])\s+latency=([^\s]+)\s+reason=(.+)$/', $line, $m)) {
                            $ok = (int)$m[2] === 1;
                            $totalCount++;
                            if (!$ok) {
                                $failCount++;
                            }
                        }
                    }
                    
                    if ($totalCount > 0) {
                        $failPercent = ($failCount / $totalCount) * 100;
                    }
                }
                
                $files[] = array(
                    'filename' => $item,
                    'fail_percent' => $failPercent
                );
            }
        }
        // 按文件名倒序（最新的在前）
        usort($files, function($a, $b) {
            return strcmp($b['filename'], $a['filename']);
        });
    }
    echo json_encode(array('files' => $files), JSON_UNESCAPED_UNICODE);
    exit;
}

// 读取日志文件统计信息 API
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_log_stats' && isset($_GET['file'])) {
    header('Content-Type: application/json; charset=utf-8');
    $logDir = __DIR__ . '/logs';
    $filename = basename($_GET['file']); // 防止路径遍历
    $logFile = $logDir . '/' . $filename;
    
    $stats = array(
        'ok' => false,
        'start_time' => null,
        'end_time' => null,
        'duration' => null,
        'fail_count' => 0,
        'total_count' => 0,
        'fail_percent' => 0,
        'error' => ''
    );
    
    if (!is_file($logFile) || !preg_match('/^log_\d{8}_\d{6}\.txt$/', $filename)) {
        $stats['error'] = '日志文件不存在或文件名无效';
        echo json_encode($stats, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $content = @file_get_contents($logFile);
    if ($content === false) {
        $stats['error'] = '无法读取日志文件';
        echo json_encode($stats, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $lines = explode("\n", trim($content));
    $firstTime = null;
    $lastTime = null;
    $failCount = 0;
    $totalCount = 0;
    $logEntries = array(); // 存储所有日志条目
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        
        // 解析格式: [2025-12-02 14:30:01] ok=1 latency=0.123 reason=http_proxy_ok
        if (preg_match('/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+ok=([01])\s+latency=([^\s]+)\s+reason=(.+)$/', $line, $m)) {
            $timeStr = $m[1];
            $ok = (int)$m[2] === 1;
            $latency = $m[3] === '-' ? null : (float)$m[3];
            $reason = $m[4];
            $totalCount++;
            if (!$ok) {
                $failCount++;
            }
            
            // 保存日志条目（按时间倒序，最新的在前）
            $logEntries[] = array(
                'time' => $timeStr,
                'ok' => $ok,
                'latency' => $latency,
                'reason' => $reason
            );
            
            $timeObj = strtotime($timeStr);
            if ($timeObj !== false) {
                if ($firstTime === null) {
                    $firstTime = $timeObj;
                }
                $lastTime = $timeObj;
            }
        }
    }
    
    // 反转数组，使最新的记录在前（因为文件是从旧到新追加的）
    $logEntries = array_reverse($logEntries);
    
    if ($totalCount > 0) {
        $stats['ok'] = true;
        $stats['start_time'] = $firstTime !== null ? date('Y-m-d H:i:s', $firstTime) : null;
        $stats['end_time'] = $lastTime !== null ? date('Y-m-d H:i:s', $lastTime) : null;
        if ($firstTime !== null && $lastTime !== null) {
            $durationSec = $lastTime - $firstTime;
            $h = floor($durationSec / 3600);
            $m = floor(($durationSec % 3600) / 60);
            $s = $durationSec % 60;
            $stats['duration'] = sprintf('%02d:%02d:%02d', $h, $m, $s);
        }
        $stats['fail_count'] = $failCount;
        $stats['total_count'] = $totalCount;
        $stats['fail_percent'] = ($failCount / $totalCount) * 100;
        $stats['log_entries'] = $logEntries; // 添加日志条目数组
    } else {
        $stats['error'] = '日志文件为空或格式不正确';
    }
    
    echo json_encode($stats, JSON_UNESCAPED_UNICODE);
    exit;
}

// Ensure default form values when not submitted
if (!isset($type)) $type = 'socks5';
if (!isset($host)) $host = '216.36.108.150';
if (!isset($port)) $port = '1080';
if (!isset($user)) $user = 'Gemini';
if (!isset($pass)) $pass = 'Gl5181081';
if (!isset($target)) $target = 'http://httpbin.org/ip';
if (!isset($interval)) $interval = '10'; // 连续检测默认间隔秒数

// 如果用户点击了访问目标按钮，要求先前有成功的检测（session 中）的记录
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['visit_target'])) {
	// 检查 session 中保存的检测信息是否与当前表单一致
	$visitResult = null;
	if (isset($_SESSION['proxy_detected']) && !empty($_SESSION['proxy_detected']['ok'])) {
		$d = $_SESSION['proxy_detected'];
		if ($d['host'] === $host && (int)$d['port'] === (int)$port && strtolower($d['type']) === strtolower($type) && $d['user'] === $user) {
			// 同一代理已检测通过，允许访问目标
			$visitResult = fetchViaProxy($type, $host, (int)$port, $user, $pass, $target);
		} else {
			$visitResult = array('ok' => false, 'error' => '检测信息与当前代理不匹配，请先检测当前代理');
		}
	} else {
		$visitResult = array('ok' => false, 'error' => '请先检测代理并确保检测通过，然后再访问目标');
	}
}

?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>代理检测工具</title>
	<style>
		/* 赛博朋克风格整体样式 */
		@keyframes neon-glow {
			0%, 100% { opacity: 1; }
			50% { opacity: 0.8; }
		}
		@keyframes scan-line {
			0% { transform: translateY(-100%); }
			100% { transform: translateY(100vh); }
		}
		
		body {
			font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
			background: #000000;
			background-image: 
				linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
				linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
			background-size: 50px 50px;
			color: #00ffff;
			padding:30px;
			position: relative;
			overflow-x: hidden;
		}
		body::before {
			content: '';
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 2px;
			background: linear-gradient(90deg, transparent, #00ffff, transparent);
			animation: scan-line 8s linear infinite;
			pointer-events: none;
			z-index: 9999;
		}

		/* 页面整体左右布局 */
		.layout {
			display: flex;
			gap: 20px;
			align-items: stretch;
			max-width: 1280px;
			margin: 0 auto;
		}
		.box {
			background: rgba(0, 0, 0, 0.9);
			border-radius: 8px;
			padding:20px 24px;
			box-shadow: 
				0 0 20px rgba(0, 255, 255, 0.3),
				0 0 40px rgba(0, 255, 255, 0.1),
				inset 0 0 20px rgba(0, 255, 255, 0.05);
			border: 2px solid #00ffff;
			position: relative;
		}
		.box::before {
			content: '';
			position: absolute;
			top: -2px;
			left: -2px;
			right: -2px;
			bottom: -2px;
			background: linear-gradient(45deg, #00ffff, #ff00ff, #00ffff);
			border-radius: 8px;
			z-index: -1;
			opacity: 0.3;
			animation: neon-glow 2s ease-in-out infinite;
		}
		.layout .left-pane {
			flex: 1; /* 表单区域 1/3 宽度 */
			min-width: 0; /* 防止 flex 子元素溢出 */
			overflow-x: hidden; /* 防止水平滚动 */
		}
		.layout .right-pane {
			flex: 2; /* 日志区域 2/3 宽度 */
			font-size: 12px;
			display:flex;
			flex-direction:column;
		}

		h2 {
			margin-top:0;
			color: #00ffff;
			text-shadow: 
				0 0 10px #00ffff,
				0 0 20px #00ffff,
				0 0 30px #00ffff;
			font-weight: bold;
			letter-spacing: 2px;
		}
		h3, h4 {
			color: #00ffff;
			text-shadow: 0 0 5px #00ffff;
		}
		.form-row, .row {
			display:flex;
			gap:12px;
		}
		.form-column, .row > div {
			flex:1;
		}
		label {
			display:block;
			font-size:13px;
			color: #00ffff;
			margin-top:12px;
			text-shadow: 0 0 3px #00ffff;
		}
		input[type=text], input[type=password], select, textarea {
			width:100%;
			padding:10px 12px;
			box-sizing:border-box;
			border: 2px solid #00ffff;
			border-radius: 4px;
			background: rgba(0, 0, 0, 0.8);
			color: #00ffff;
			box-shadow: 
				0 0 10px rgba(0, 255, 255, 0.3),
				inset 0 0 10px rgba(0, 255, 255, 0.1);
			transition: all 0.3s ease;
		}
		input[type=text]:focus, input[type=password]:focus, select:focus, textarea:focus {
			outline: none;
			border-color: #ff00ff;
			box-shadow: 
				0 0 20px rgba(255, 0, 255, 0.5),
				0 0 40px rgba(255, 0, 255, 0.3),
				inset 0 0 15px rgba(255, 0, 255, 0.2);
		}
		input::placeholder {
			color: rgba(0, 255, 255, 0.5);
		}
		textarea {
			font-family: Menlo, Monaco, Consolas, monospace;
		}
		.controls {
			display:flex;
			gap:10px;
			align-items:center;
			margin-top:14px;
		}
		.btn {
			padding:10px 14px;
			border-radius: 4px;
			border: 2px solid;
			cursor:pointer;
			font-size:13px;
			font-weight:bold;
			transition: all 0.3s ease;
			text-transform: uppercase;
			letter-spacing: 1px;
			position: relative;
			overflow: hidden;
		}
		.btn::before {
			content: '';
			position: absolute;
			top: 0;
			left: -100%;
			width: 100%;
			height: 100%;
			background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
			transition: left 0.5s;
		}
		.btn:hover::before {
			left: 100%;
		}
		.btn-primary {
			background: rgba(0, 100, 255, 0.2);
			color: #00aaff;
			border-color: #00aaff;
			box-shadow: 
				0 0 10px rgba(0, 170, 255, 0.5),
				inset 0 0 10px rgba(0, 170, 255, 0.1);
		}
		.btn-primary:hover {
			background: rgba(0, 100, 255, 0.4);
			box-shadow: 
				0 0 20px rgba(0, 170, 255, 0.8),
				0 0 40px rgba(0, 170, 255, 0.4),
				inset 0 0 15px rgba(0, 170, 255, 0.2);
			text-shadow: 0 0 10px #00aaff;
		}
		.btn-success {
			background: rgba(0, 255, 100, 0.2);
			color: #00ff66;
			border-color: #00ff66;
			box-shadow: 
				0 0 10px rgba(0, 255, 100, 0.5),
				inset 0 0 10px rgba(0, 255, 100, 0.1);
		}
		.btn-success:hover {
			background: rgba(0, 255, 100, 0.4);
			box-shadow: 
				0 0 20px rgba(0, 255, 100, 0.8),
				0 0 40px rgba(0, 255, 100, 0.4),
				inset 0 0 15px rgba(0, 255, 100, 0.2);
			text-shadow: 0 0 10px #00ff66;
		}
		.btn-danger {
			background: rgba(255, 0, 100, 0.2);
			color: #ff0066;
			border-color: #ff0066;
			box-shadow: 
				0 0 10px rgba(255, 0, 100, 0.5),
				inset 0 0 10px rgba(255, 0, 100, 0.1);
		}
		.btn-danger:hover {
			background: rgba(255, 0, 100, 0.4);
			box-shadow: 
				0 0 20px rgba(255, 0, 100, 0.8),
				0 0 40px rgba(255, 0, 100, 0.4),
				inset 0 0 15px rgba(255, 0, 100, 0.2);
			text-shadow: 0 0 10px #ff0066;
		}
		.btn-secondary {
			background:#0f172a;
			color:#e5e7eb;
			border:1px solid rgba(148,163,184,0.6);
		}
		.btn-secondary:hover {
			background:#020617;
		}
		.btn[disabled] {
			opacity:0.45;
			cursor:not-allowed;
		}
		.card {
			background: rgba(0, 0, 0, 0.8);
			border: 2px solid #00ffff;
			padding:12px;
			border-radius: 4px;
			margin-top:14px;
			box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
		}
		pre {
			background: rgba(0, 0, 0, 0.9);
			padding:12px;
			overflow:auto;
			border-radius: 4px;
			border: 2px solid #00ffff;
			color: #00ffff;
			box-shadow: 
				0 0 10px rgba(0, 255, 255, 0.3),
				inset 0 0 10px rgba(0, 255, 255, 0.1);
			font-family: 'Courier New', monospace;
		}
		.status-ok { 
			color: #00ff66; 
			font-weight:600; 
			text-shadow: 0 0 5px #00ff66;
		}
		.status-fail { 
			color: #ff0066; 
			font-weight:600; 
			text-shadow: 0 0 5px #ff0066;
		}
		.small { font-size:12px; color: rgba(0, 255, 255, 0.7); }
		label.note { display:block; margin-top:8px; color: rgba(0, 255, 255, 0.7); font-size:12px; }

		/* 连续测试日志样式 */
		#continuous-stats {
			font-size: 12px;
			margin-bottom: 8px;
			border-bottom: 2px solid #00ffff;
			padding-bottom: 6px;
			box-shadow: 0 2px 5px rgba(0, 255, 255, 0.2);
		}
		#continuous-stats span.label {
			font-weight: 600;
			color: #00ffff;
			text-shadow: 0 0 3px #00ffff;
		}
		/* 故障统计行字号放大 */
		#stat-line-fail {
			font-size: 18px;
			margin-top: 4px;
		}
		/* 自定义下拉菜单样式 */
		#log-selector-display:hover {
			background: rgba(0, 255, 255, 0.1);
			box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
		}
		#log-selector-display::after {
			content: ' ▼';
			font-size: 10px;
			opacity: 0.7;
			color: #00ffff;
		}
		.log-option {
			padding: 8px 12px;
			cursor: pointer;
			color: #00ffff;
			font-size: 11px;
			transition: all 0.2s ease;
		}
		.log-option:hover {
			background: rgba(0, 255, 255, 0.2) !important;
			box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
			text-shadow: 0 0 5px #00ffff;
		}
		.log-option:last-child {
			border-bottom: none;
		}
		#continuous-log {
			font-family: Menlo, Monaco, Consolas, monospace;
			margin-top:4px;
			height: 560px;           /* 约 40 行高度（40 * 14px） */
			max-height: 560px;
			overflow-y:auto;         /* 日志内部滚动，固定高度 */
		}
		.log-line {
			padding: 4px 6px;
			border-bottom: 1px solid rgba(0, 255, 255, 0.2);
			white-space: nowrap;
			display:flex;
			gap:10px;
			align-items:center;
			font-size:12px;
			transition: all 0.2s ease;
		}
		.log-line:hover {
			background: rgba(0, 255, 255, 0.05);
			border-left: 2px solid #00ffff;
			padding-left: 8px;
		}
		.log-line span.time-local {
			color: #00ffff;
			text-shadow: 0 0 2px #00ffff;
		}
		.log-line span.time-server {
			color: rgba(0, 255, 255, 0.6);
		}
		.log-line span.status-ok {
			color: #00ff66;
			text-shadow: 0 0 5px #00ff66;
			font-weight: bold;
		}
		.log-line span.status-fail {
			color: #ff0066;
			text-shadow: 0 0 5px #ff0066;
			font-weight: bold;
		}
		.log-line span.extra {
			color: rgba(0, 255, 255, 0.8);
		}
		.log-line.ok {
			background:transparent;
		}
		.log-line.fail {
			background: rgba(255, 0, 100, 0.15);
			border-left: 2px solid #ff0066;
			box-shadow: inset 0 0 10px rgba(255, 0, 100, 0.2);
		}
	</style>
</head>
<body>
<div class="layout">
	<div class="box left-pane">
		<h2>代理检测工具</h2>
		<form method="post">
			<label>代理类型
				<select name="type">
					<option value="http"<?php if(isset($type) && $type==='http') echo ' selected'; ?>>HTTP</option>
					<option value="https"<?php if(isset($type) && $type==='https') echo ' selected'; ?>>HTTPS</option>
					<option value="socks5"<?php if(isset($type) && $type==='socks5') echo ' selected'; ?>>SOCKS5</option>
				</select>
			</label>

			<div class="row">
				<div>
					<label>代理地址（IP 或 域名）
						<input type="text" name="host" value="<?php if(isset($host)) echo h($host); ?>" placeholder="例如 1.2.3.4 或 proxy.example.com">
					</label>
				</div>
				<div>
					<label>端口
						<input type="text" name="port" value="<?php if(isset($port)) echo h($port); ?>" placeholder="例如 8080">
					</label>
				</div>
			</div>

			<div class="row">
				<div>
					<label>用户名（可选）
						<input type="text" name="user" value="<?php if(isset($user)) echo h($user); ?>">
					</label>
				</div>
				<div>
					<label>密码（可选）
						<input type="password" name="pass" value="<?php if(isset($pass)) echo h($pass); ?>">
					</label>
				</div>
			</div>

			<div class="row" style="align-items:flex-end;">
				<div>
					<label>检测间隔（秒）
						<input type="text" name="interval" value="<?php echo isset($interval) ? h($interval) : '10'; ?>" placeholder="例如 10">
					</label>
				</div>
				<div style="display:flex; gap:10px; align-items:center;">
					<button class="btn btn-primary" type="submit" name="test_proxy">测试代理</button>
					<!-- 新增：连续测试按钮 -->
					<button class="btn btn-success" type="button" id="continuous-btn">连续监测</button>
				</div>
			</div>

			<label style="margin-top:20px;">目标 URL（默认 http://httpbin.org/ip，用于检测代理是否能访问该地址）
				<div style="display:flex;gap:8px;align-items:center;">
					<input type="text" name="target" value="<?php if(isset($target)) echo h($target); else echo 'http://httpbin.org/ip'; ?>" placeholder="例如 http://example.com/path" style="flex:1;">
					<?php
						$visitedDisabled = 'disabled';
						if (isset($_SESSION['proxy_detected']) && !empty($_SESSION['proxy_detected']['ok'])) {
							$d = $_SESSION['proxy_detected'];
							if ($d['host'] === (isset($host) ? $host : '') && (int)$d['port'] === (int)(isset($port) ? $port : 0) && strtolower($d['type']) === strtolower((isset($type) ? $type : '')) && $d['user'] === (isset($user) ? $user : '')) {
								$visitedDisabled = '';
							}
						}
					?>
					<button class="btn btn-primary" type="submit" name="visit_target" style="flex:0 0 auto;" <?php echo $visitedDisabled; ?>>访问目标</button>
				</div>
			</label>
		</form>

		<?php if ($result !== null): ?>
			<h3>检测结果</h3>
			<?php if (!empty($result['ok'])): ?>
				<?php
					$methodLabel = isset($result['method']) ? $result['method'] : (isset($result['reason']) ? $result['reason'] : '检测成功');
					$details = isset($result['detail']) ? $result['detail'] : (isset($result['diag']) ? $result['diag'] : $result);
				?>
				<p class="ok">检测通过（<?php echo h($methodLabel); ?>）。</p>
				<pre><?php echo h(json_encode($details, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT)); ?></pre>
			<?php else: ?>
				<p class="fail">检测未通过。</p>
				<pre><?php echo h(json_encode($result, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT)); ?></pre>
				<p>说明：系统先尝试通过 <code>cURL</code> 或直接通过代理向目标 URL（<code><?php echo isset($target) ? h($target) : 'http://httpbin.org/ip'; ?></code>）发起请求；如果失败，会回退到建立到代理端口的 TCP 连接测试以判断端口是否开放，并尝试协议级探测获取更详细失败原因（如 407 认证、SOCKS5 握手失败等）。</p>
			<?php endif; ?>
		<?php endif; ?>

		<?php if (!empty($visitResult)): ?>
			<div style="margin-top:20px; border-top:1px solid rgba(148,163,184,0.3); padding-top:15px;">
				<h3>访问目标结果（<?php echo h($target); ?>）</h3>
				<div style="width:100%; height:400px; overflow:auto; border:1px solid rgba(148,163,184,0.6); border-radius:6px; padding:12px; background:#0f172a; box-sizing:border-box;">
					<?php if (!empty($visitResult['ok'])): ?>
						<p style="margin-top:0;">HTTP 状态：<?php echo h($visitResult['http_code']); ?>，用时 <?php echo h($visitResult['time']); ?>s</p>
						<h4 style="margin-top:12px; margin-bottom:6px;">响应头</h4>
						<pre style="margin:0; overflow-x:auto; white-space:pre-wrap; word-wrap:break-word;"><?php echo h($visitResult['headers']); ?></pre>
						<h4 style="margin-top:12px; margin-bottom:6px;">响应内容预览（iframe，已隔离）</h4>
						<iframe sandbox="" srcdoc="<?php echo htmlspecialchars($visitResult['body'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); ?>" style="width:100%;height:200px;border:1px solid rgba(148,163,184,0.6); border-radius:4px;"></iframe>
						<h4 style="margin-top:12px; margin-bottom:6px;">响应原文（文本）</h4>
						<textarea readonly style="width:100%;height:150px; resize:none; font-family:Menlo, Monaco, Consolas, monospace; font-size:11px; background:#020617; color:#ffffff; border:1px solid rgba(148,163,184,0.6); border-radius:4px; padding:8px; box-sizing:border-box;"><?php echo htmlspecialchars($visitResult['body'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); ?></textarea>
					<?php else: ?>
						<p class="fail" style="margin-top:0;">访问失败：<?php echo h(isset($visitResult['error']) ? $visitResult['error'] : json_encode($visitResult, JSON_UNESCAPED_UNICODE)); ?></p>
					<?php endif; ?>
				</div>
			</div>
		<?php endif; ?>
	</div>

	<!-- 右侧：连续测试统计与日志 -->
	<div class="box right-pane">
		<h3>连续测试日志</h3>
		<div id="continuous-stats">
			<div><span class="label">开始时间：</span><span id="stat-start">-</span></div>
			<div><span class="label">当前时间：</span><span id="stat-now">-</span></div>
			<div><span class="label">测试时长：</span><span id="stat-duration">-</span></div>
			<div id="stat-line-fail" style="display:flex; align-items:center; gap:12px;">
				<div style="flex:1;">
					<span class="label">故障次数：</span>
					<span id="stat-fail" style="color:#f97373;">0</span>
					<span class="label"> / 总次数：</span>
					<span id="stat-total">0</span>
					<span class="label"> / 故障百分比：</span>
					<span id="stat-percent">-</span>
				</div>
				<div style="position:relative;">
					<div id="log-selector-wrapper" style="position:relative;">
						<div id="log-selector-display" style="padding:6px 10px; border-radius:4px; background:rgba(0,0,0,0.8); border:2px solid #00ffff; color:#00ffff; font-size:10px; cursor:pointer; min-width:200px; user-select:none; box-shadow: 0 0 10px rgba(0,255,255,0.3);">
							当前测试
						</div>
						<div id="log-selector-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; margin-top:4px; background:rgba(0,0,0,0.95); border:2px solid #00ffff; border-radius:4px; max-height:300px; overflow-y:auto; z-index:1000; box-shadow: 0 0 20px rgba(0,255,255,0.5), inset 0 0 20px rgba(0,255,255,0.1); font-size:11px;">
							<div class="log-option" data-value="" style="padding:8px 12px; cursor:pointer; color:#00ffff; background:rgba(0,0,0,0.8); border-bottom:2px solid rgba(0,255,255,0.3); font-size:11px;">当前测试</div>
						</div>
					</div>
					<!-- 隐藏的 select 用于保持兼容性 -->
					<select id="log-selector" style="display:none;">
						<option value="">当前测试</option>
					</select>
				</div>
			</div>
		</div>
		<div id="continuous-log"></div>
	</div>
</div>

<script>
(function () {
    const form = document.querySelector('form');
    const btn = document.getElementById('continuous-btn');
    const logContainer = document.getElementById('continuous-log');
    const statStart = document.getElementById('stat-start');
    const statNow = document.getElementById('stat-now');
    const statFail = document.getElementById('stat-fail');
    const statTotal = document.getElementById('stat-total');
    const statPercent = document.getElementById('stat-percent');
    const statDuration = document.getElementById('stat-duration');
    const logSelector = document.getElementById('log-selector');
    const logSelectorDisplay = document.getElementById('log-selector-display');
    const logSelectorDropdown = document.getElementById('log-selector-dropdown');

    if (!form || !btn || !logContainer || !statStart || !statNow || !statFail || !statTotal || !statPercent || !statDuration || !logSelector || !logSelectorDisplay || !logSelectorDropdown) return;

    let running = false;
    let timer = null;
    let startTime = null;
    let failCount = 0;
    let totalCount = 0;
    let firstCallInSession = false;
    let historyStats = null; // 当前选择的历史日志统计

    function formatDate(d) {
        const pad = n => (n < 10 ? '0' + n : '' + n);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function updateStats() {
        const now = new Date();

        // 如果选择了历史日志，使用历史统计数据
        if (historyStats && historyStats.ok) {
            statStart.textContent = historyStats.start_time || '-';
            statDuration.textContent = historyStats.duration || '-';
            statNow.textContent = formatDate(now);
            statFail.textContent = historyStats.fail_count.toString();
            statTotal.textContent = historyStats.total_count.toString();

            if (historyStats.total_count === 0) {
                statPercent.textContent = '-';
                statPercent.style.color = '#9ca3af';
            } else {
                const pct = historyStats.fail_percent;
                const pctText = pct.toFixed(1) + '%';
                statPercent.textContent = pctText;

                // 百分比颜色区间
                if (pct < 10) {
                    statPercent.style.color = '#4ade80';   // 绿色
                } else if (pct < 30) {
                    statPercent.style.color = '#bbf7d0';   // 淡绿色
                } else if (pct < 50) {
                    statPercent.style.color = '#facc15';   // 黄色
                } else if (pct < 80) {
                    statPercent.style.color = '#fb923c';   // 橙色
                } else {
                    statPercent.style.color = '#f97373';   // 红色
                }
            }
            return;
        }

        // 否则使用实时统计数据
        if (startTime) {
            statStart.textContent = formatDate(startTime);
            // 计算测试时长
            const diffMs = now.getTime() - startTime.getTime();
            const totalSec = Math.floor(diffMs / 1000);
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            statDuration.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
        } else {
            statStart.textContent = '-';
            statDuration.textContent = '-';
        }
        statNow.textContent = formatDate(now);
        statFail.textContent = failCount.toString();
        statTotal.textContent = totalCount.toString();

        if (totalCount === 0) {
            statPercent.textContent = '-';
            statPercent.style.color = '#9ca3af';
        } else {
            const pct = (failCount / totalCount) * 100;
            const pctText = pct.toFixed(1) + '%';
            statPercent.textContent = pctText;

            // 百分比颜色区间
            if (pct < 10) {
                statPercent.style.color = '#4ade80';   // 绿色
            } else if (pct < 30) {
                statPercent.style.color = '#bbf7d0';   // 淡绿色
            } else if (pct < 50) {
                statPercent.style.color = '#facc15';   // 黄色
            } else if (pct < 80) {
                statPercent.style.color = '#fb923c';   // 橙色
            } else {
                statPercent.style.color = '#f97373';   // 红色
            }
        }
    }

    function appendLogLine(data) {
        const div = document.createElement('div');
        div.className = 'log-line ' + (data.ok ? 'ok' : 'fail');

        const localNow = new Date();
        const localText = formatDate(localNow);
        const serverText = data.time || localText;
        const latencyText = (data.latency != null ? (data.latency.toFixed(3) + 's') : '-');

        // 根据 reason 判断状态显示文本
        let statusText = '';
        if (data.reason === '开始连续监测') {
            statusText = '开始';
        } else if (data.reason === '停止连续监测') {
            statusText = '停止';
        } else {
            statusText = data.ok ? '联通' : '失败';
        }

        div.innerHTML =
            '<span class="time-local">[本机 ' + localText + ']</span>' +
            '<span class="time-server">[服务器 ' + serverText + ']</span>' +
            '<span class="' + (data.ok ? 'status-ok' : 'status-fail') + '">' +
                statusText +
            '</span>' +
            '<span class="extra">延迟: ' + latencyText + (data.reason ? (' ｜ 原因: ' + data.reason) : '') + '</span>';

        // 倒序：最新记录插入到最上面
        if (logContainer.firstChild) {
            logContainer.insertBefore(div, logContainer.firstChild);
        } else {
            logContainer.appendChild(div);
        }
    }

    // 根据故障百分比获取文字颜色
    function getFailPercentColor(pct) {
        if (pct < 10) {
            return '#4ade80';   // 深绿色
        } else if (pct < 30) {
            return '#bbf7d0';   // 浅绿色
        } else if (pct < 50) {
            return '#facc15';   // 黄色
        } else if (pct < 80) {
            return '#fb923c';   // 橙色
        } else {
            return '#f97373';   // 红色
        }
    }

    // 根据故障百分比获取背景颜色（用于下拉菜单选项）
    function getFailPercentBgColor(pct) {
        if (pct < 10) {
            return 'rgba(74, 222, 128, 0.4)';   // 深绿色背景（更明显）
        } else if (pct < 30) {
            return 'rgba(187, 247, 208, 0.4)';   // 浅绿色背景（更明显）
        } else if (pct < 50) {
            return 'rgba(250, 204, 21, 0.4)';   // 黄色背景（更明显）
        } else if (pct < 80) {
            return 'rgba(251, 146, 60, 0.4)';   // 橙色背景（更明显）
        } else {
            return 'rgba(249, 115, 115, 0.4)';   // 红色背景（更明显）
        }
    }

    // 获取日志文件列表并填充下拉菜单
    async function loadLogList() {
        try {
            const resp = await fetch('?action=get_log_list');
            const json = await resp.json();
            if (json.files && Array.isArray(json.files)) {
                // 清空现有选项（保留"当前测试"）
                while (logSelector.options.length > 1) {
                    logSelector.remove(1);
                }
                // 清空自定义下拉菜单（保留"当前测试"）
                const existingOptions = logSelectorDropdown.querySelectorAll('.log-option:not([data-value=""])');
                existingOptions.forEach(opt => opt.remove());
                
                // 添加日志文件选项
                json.files.forEach(fileInfo => {
                    const filename = fileInfo.filename || fileInfo; // 兼容旧格式
                    const failPercent = fileInfo.fail_percent !== undefined ? fileInfo.fail_percent : 0;
                    const percentText = ` (${failPercent.toFixed(1)}%)`;
                    const bgColor = getFailPercentBgColor(failPercent);
                    
                    // 添加到隐藏的 select（保持兼容性）
                    const opt = document.createElement('option');
                    opt.value = filename;
                    opt.textContent = filename + percentText;
                    logSelector.appendChild(opt);
                    
                    // 添加到自定义下拉菜单
                    const divOpt = document.createElement('div');
                    divOpt.className = 'log-option';
                    divOpt.setAttribute('data-value', filename);
                    divOpt.setAttribute('data-fail-percent', failPercent.toFixed(1));
                    divOpt.textContent = filename + percentText;
                    divOpt.style.backgroundColor = bgColor;
                    divOpt.style.borderBottom = '2px solid rgba(0,255,255,0.3)';
                    
                    // 点击选项事件
                    divOpt.addEventListener('click', function() {
                        selectLogFile(filename);
                        logSelectorDropdown.style.display = 'none';
                    });
                    
                    logSelectorDropdown.appendChild(divOpt);
                });
            }
        } catch (e) {
            console.error('加载日志列表失败:', e);
        }
    }

    // 选择日志文件
    function selectLogFile(filename) {
        logSelector.value = filename;
        if (filename) {
            logSelectorDisplay.textContent = filename + ` (${getFilePercent(filename)}%)`;
        } else {
            logSelectorDisplay.textContent = '当前测试';
        }
        // 触发 change 事件
        logSelector.dispatchEvent(new Event('change'));
    }

    // 获取文件的故障百分比（从下拉菜单中查找）
    function getFilePercent(filename) {
        const opt = logSelectorDropdown.querySelector(`.log-option[data-value="${filename}"]`);
        if (opt) {
            return opt.getAttribute('data-fail-percent') || '0';
        }
        return '0';
    }

    // 加载指定日志文件的统计信息和日志明细
    async function loadLogStats(filename) {
        if (!filename) {
            historyStats = null;
            updateStats();
            return;
        }
        try {
            const resp = await fetch('?action=get_log_stats&file=' + encodeURIComponent(filename));
            const json = await resp.json();
            if (json.ok) {
                historyStats = json;
                updateStats();
                
                // 清空日志明细区域
                logContainer.innerHTML = '';
                
                // 显示日志文件中的所有条目
                if (json.log_entries && Array.isArray(json.log_entries)) {
                    json.log_entries.forEach(entry => {
                        appendLogLine({
                            ok: entry.ok,
                            time: entry.time,
                            latency: entry.latency,
                            reason: entry.reason || ''
                        });
                    });
                }
            } else {
                alert('加载日志统计失败: ' + (json.error || '未知错误'));
                historyStats = null;
                updateStats();
                logContainer.innerHTML = '';
            }
        } catch (e) {
            alert('加载日志统计失败: ' + e);
            historyStats = null;
            updateStats();
            logContainer.innerHTML = '';
        }
    }

    // 自定义下拉菜单显示/隐藏
    logSelectorDisplay.addEventListener('click', function(e) {
        e.stopPropagation();
        const isVisible = logSelectorDropdown.style.display === 'block';
        logSelectorDropdown.style.display = isVisible ? 'none' : 'block';
    });

    // 点击"当前测试"选项
    const currentTestOption = logSelectorDropdown.querySelector('.log-option[data-value=""]');
    if (currentTestOption) {
        currentTestOption.addEventListener('click', function() {
            selectLogFile('');
            logSelectorDropdown.style.display = 'none';
        });
    }

    // 点击外部区域关闭下拉菜单
    document.addEventListener('click', function(e) {
        if (!logSelectorDisplay.contains(e.target) && !logSelectorDropdown.contains(e.target)) {
            logSelectorDropdown.style.display = 'none';
        }
    });

    // 下拉菜单变化处理
    logSelector.addEventListener('change', function() {
        const selectedFile = this.value;
        if (selectedFile) {
            loadLogStats(selectedFile);
        } else {
            historyStats = null;
            updateStats();
            // 切换回"当前测试"时，如果不在运行状态，清空日志明细
            // 如果在运行状态，不清空，让实时日志继续追加
            if (!running) {
                logContainer.innerHTML = '';
            }
        }
    });

    // 页面加载时获取日志列表
    loadLogList();

    async function runOnce() {
        const fd = new FormData(form);
        // 指定这是一次“测试代理”的请求，并要求 JSON 响应
        fd.set('test_proxy', '1');
        fd.set('continuous_api', '1');

        // 如果是本次连续测试的第一次调用，请求服务器重新生成日志文件
        if (firstCallInSession) {
            fd.set('log_reset', '1');
            firstCallInSession = false;
        }

        try {
            const resp = await fetch('', {
                method: 'POST',
                body: fd
            });
            const json = await resp.json();
            const ok = !!json.ok;
            totalCount++;
            if (!ok) failCount++;
            appendLogLine({
                ok: ok,
                time: json.time || formatDate(new Date()),
                latency: typeof json.latency === 'number' ? json.latency : null,
                reason: json.reason || ''
            });
        } catch (e) {
            failCount++;
            appendLogLine({
                ok: false,
                time: formatDate(new Date()),
                latency: null,
                reason: '请求异常: ' + e
            });
        }
        updateStats();
    }

    function start() {
        if (running) return;
        running = true;
        startTime = new Date();
        failCount = 0;
        totalCount = 0;
        firstCallInSession = true;
        // 清空右侧日志区域，重新开始输出
        logContainer.innerHTML = '';
        // 重置下拉菜单为"当前测试"，清除历史统计
        logSelector.value = '';
        logSelectorDisplay.textContent = '当前测试';
        historyStats = null;
        btn.textContent = '停止监测';
        // 切换按钮颜色为红色
        btn.className = 'btn btn-danger';

        appendLogLine({
            ok: true,
            time: formatDate(startTime),
            latency: null,
            reason: '开始连续监测'
        });
        updateStats();

        // 读取间隔时间（秒），默认 10，限制在 1~3600
        let intervalInput = form.querySelector('input[name="interval"]');
        let intervalSec = 10;
        if (intervalInput && intervalInput.value) {
            const v = parseInt(intervalInput.value, 10);
            if (!isNaN(v) && v > 0 && v <= 3600) {
                intervalSec = v;
            }
        }

        // 立即测试一次，然后每 intervalSec 秒测一次
        runOnce();
        timer = setInterval(runOnce, intervalSec * 1000);
    }

    function stop() {
        if (!running) return;
        running = false;
        btn.textContent = '连续监测';
        // 切换按钮颜色为绿色
        btn.className = 'btn btn-success';
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        appendLogLine({
            ok: true,
            time: formatDate(new Date()),
            latency: null,
            reason: '停止连续监测'
        });
        updateStats();
        // 停止后刷新日志列表，以便显示新生成的日志文件
        loadLogList();
    }

    btn.addEventListener('click', function () {
        if (running) {
            stop();
        } else {
            start();
        }
    });

    // 每秒更新一次“当前时间”
    setInterval(updateStats, 1000);
})();
</script>
</body>
</html>
