<?php
// Proxy检测页面：表单 + 后端检测逻辑
// 使用说明：选择代理类型、填写地址与端口（可选用户名/密码），点击“检测”查看结果。

function h($s) {
	return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function testProxyWithCurl($type, $host, $port, $user = '', $pass = '', $testUrl = 'http://httpbin.org/ip') {
	if (!function_exists('curl_version')) {
		return array('ok' => false, 'reason' => 'cURL not available');
	}

	$proxy = $host . ':' . $port;
	$ch = curl_init();

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
			$ptype = defined('CURLPROXY_SOCKS5') ? CURLPROXY_SOCKS5 : 7;
			break;
		default:
			$ptype = defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0;
	}

	curl_setopt($ch, CURLOPT_PROXYTYPE, $ptype);

	if ($user !== '' || $pass !== '') {
		curl_setopt($ch, CURLOPT_PROXYUSERPWD, $user . ':' . $pass);
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
	$type = isset($_POST['type']) ? trim($_POST['type']) : 'http';
	$host = isset($_POST['host']) ? trim($_POST['host']) : '';
	$port = isset($_POST['port']) ? trim($_POST['port']) : '';
	$user = isset($_POST['user']) ? trim($_POST['user']) : '';
	$pass = isset($_POST['pass']) ? trim($_POST['pass']) : '';
	$target = isset($_POST['target']) ? trim($_POST['target']) : 'http://httpbin.org/ip';

	// 验证目标 URL
	$target_ok = false;
	$targetHost = 'httpbin.org';
	$targetPort = 80;
	$targetScheme = 'http';
	if (!empty($target)) {
		$u = parse_url($target);
		if ($u !== false && isset($u['scheme']) && isset($u['host']) && in_array(strtolower($u['scheme']), array('http','https'))) {
			$target_ok = true;
			$targetHost = $u['host'];
			$targetScheme = strtolower($u['scheme']);
			if (isset($u['port'])) $targetPort = (int)$u['port'];
			else $targetPort = ($targetScheme === 'https') ? 443 : 80;
		}
	}

	$visitResult = null;
	if (isset($_POST['visit_target']) && $target_ok) {
		// 使用 cURL 通过代理访问目标 URL 并返回头/体
		function fetchViaProxy($type, $host, $port, $user, $pass, $targetUrl) {
			// 优先使用 cURL；若不可用，则尝试 stream/file_get_contents 或手工 CONNECT 回退（仅支持 HTTP/HTTPS）
			if (function_exists('curl_version')) {
				$ch = curl_init();
				curl_setopt($ch, CURLOPT_URL, $targetUrl);
				curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
				curl_setopt($ch, CURLOPT_HEADER, true);
				curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
				curl_setopt($ch, CURLOPT_TIMEOUT, 20);
				curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
				// set proxy if provided
				if (!empty($host) && !empty($port)) {
					$proxy = $host . ':' . $port;
					curl_setopt($ch, CURLOPT_PROXY, $proxy);
					switch (strtolower($type)) {
						case 'http':
							$ptype = defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0; break;
						case 'https':
							$ptype = defined('CURLPROXY_HTTPS') ? CURLPROXY_HTTPS : (defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0); break;
						case 'socks5':
							$ptype = defined('CURLPROXY_SOCKS5') ? CURLPROXY_SOCKS5 : 7; break;
						default:
							$ptype = defined('CURLPROXY_HTTP') ? CURLPROXY_HTTP : 0;
					}
					curl_setopt($ch, CURLOPT_PROXYTYPE, $ptype);
					if ($user !== '' || $pass !== '') {
						curl_setopt($ch, CURLOPT_PROXYUSERPWD, $user . ':' . $pass);
					}
				}
				// disable SSL verify for detection convenience
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
				// NOTE: SOCKS5 proxy is not supported by this fallback; require cURL for SOCKS5.
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
				// 当存在代理时，根据 scheme 选择不同方式
				$proxyAuthHeader = '';
				if ($user !== '' || $pass !== '') $proxyAuthHeader = 'Proxy-Authorization: Basic ' . base64_encode($user . ':' . $pass) . "\r\n";
				if ($scheme === 'http') {
					// 使用 stream context 指定 proxy 和 request_fulluri
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
					// 手工 CONNECT 到代理，然后开启 TLS
					$errno = 0; $errstr = '';
					$fp = @stream_socket_client('tcp://' . $host . ':' . $port, $errno, $errstr, 10);
					if (!$fp) return array('ok'=>false,'error'=>'proxy connect failed','errno'=>$errno,'errstr'=>$errstr);
					$connectReq = "CONNECT $targetHost:$targetPort HTTP/1.1\r\nHost: $targetHost\r\n" . $proxyAuthHeader . "Connection: close\r\n\r\n";
					fwrite($fp, $connectReq);
					// read response header
					$resp = '';
					while (!feof($fp)) {
						$line = fgets($fp, 1024);
						$resp .= $line;
						if (rtrim($line) == '') break; // end of headers
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
					// 升级为 TLS
					stream_set_blocking($fp, true);
					$crypto = @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
					if ($crypto !== true) {
						fclose($fp);
						return array('ok'=>false,'error'=>'TLS handshake failed');
					}
					// 发送 GET 请求
					$out = "GET $path HTTP/1.1\r\nHost: $targetHost\r\nConnection: close\r\n\r\n";
					fwrite($fp, $out);
					$respBody = '';
					while (!feof($fp)) {
						$respBody .= fgets($fp, 1024);
					}
					fclose($fp);
					// split headers/body
					$parts = preg_split("/\r\n\r\n/", $respBody, 2);
					$headers = isset($parts[0]) ? $parts[0] : '';
					$body = isset($parts[1]) ? $parts[1] : '';
					return array('ok'=>true,'http_code'=>$code,'headers'=>$headers,'body'=>$body,'time'=>0);
				} else {
					return array('ok'=>false,'error'=>'unsupported scheme fallback');
				}
			}
		}

		$visitResult = fetchViaProxy($type, $host, (int)$port, $user, $pass, $target);
	}

	// 如果是点击【检测代理】，执行诊断流程
	if (isset($_POST['test_proxy'])) {
		if ($host === '' || $port === '') {
		$result = array('ok' => false, 'error' => '代理地址或端口不能为空');
		} else if (!is_numeric($port) || (int)$port <= 0 || (int)$port > 65535) {
			$result = array('ok' => false, 'error' => '端口号无效');
		} else {
		// 逐步诊断：DNS -> TCP -> 协议级检测（HTTP 或 SOCKS5） -> 可选 cURL 功能测试
		$diag = array();
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
					} else {
						$result = array('ok' => false, 'reason' => 'socks5_failed', 'diag' => $diag);
					}
				} else {
					// HTTP/HTTPS proxy probe
					$diag['http_probe'] = httpProxyProbe($host, (int)$port, $user, $pass, $target);
					if (!empty($diag['http_probe']['ok'])) {
						$result = array('ok' => true, 'reason' => 'http_proxy_ok', 'diag' => $diag);
					} else {
						// 额外尝试使用 cURL 获取更详细错误信息
						$diag['curl'] = testProxyWithCurl($type, $host, (int)$port, $user, $pass, $target);
						$result = array('ok' => false, 'reason' => 'http_proxy_failed', 'diag' => $diag);
					}
				}
			}
		}
	}
}
}
// Ensure default form values when not submitted
if (!isset($type)) $type = 'socks5';
if (!isset($host)) $host = '216.36.108.150';
if (!isset($port)) $port = '1080';
if (!isset($user)) $user = 'Gemini';
if (!isset($pass)) $pass = 'Gl5181081';
if (!isset($target)) $target = 'http://httpbin.org/ip';

?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>代理检测工具</title>
	<style>
		body { font-family: Arial, sans-serif; padding: 20px; }
		.box { max-width: 720px; margin: 0 auto; }
		label { display:block; margin-top:10px; }
		input[type=text], input[type=password], select { width:100%; padding:8px; box-sizing:border-box; }
		.row { display:flex; gap:10px; }
		.row > * { flex:1; }
		.btn { margin-top:12px; padding:10px 14px; }
		pre { background:#f5f5f5; padding:12px; overflow:auto; }
		.ok { color:green; }
		.fail { color:red; }
	</style>
</head>
<body>
<div class="box">
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

		<label>目标 URL（默认 http://httpbin.org/ip，用于检测代理是否能访问该地址）
			<div style="display:flex;gap:8px;align-items:center;">
				<input type="text" name="target" value="<?php if(isset($target)) echo h($target); else echo 'http://httpbin.org/ip'; ?>" placeholder="例如 http://example.com/path" style="flex:1;">
				<button class="btn" type="submit" name="visit_target" style="flex:0 0 auto;">访问目标</button>
			</div>
		</label>

		<button class="btn" type="submit" name="test_proxy">检测代理</button>
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
		<h3>访问目标结果（<?php echo h($target); ?>）</h3>
		<?php if (!empty($visitResult['ok'])): ?>
			<p>HTTP 状态：<?php echo h($visitResult['http_code']); ?>，用时 <?php echo h($visitResult['time']); ?>s</p>
			<h4>响应头</h4>
			<pre><?php echo h($visitResult['headers']); ?></pre>
			<h4>响应内容预览（iframe，已隔离）</h4>
			<iframe sandbox="" srcdoc="<?php echo htmlspecialchars($visitResult['body'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); ?>" style="width:100%;height:600px;border:1px solid #ccc;"></iframe>
			<h4>响应原文（文本）</h4>
			<textarea style="width:100%;height:250px;"><?php echo htmlspecialchars($visitResult['body'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); ?></textarea>
		<?php else: ?>
			<p class="fail">访问失败：<?php echo h(isset($visitResult['error']) ? $visitResult['error'] : json_encode($visitResult, JSON_UNESCAPED_UNICODE)); ?></p>
		<?php endif; ?>
	<?php endif; ?>

</div>
</body>
</html>
