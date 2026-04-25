<?php
// 3x-ui 统一管理 Dashboard - 服务器配置
// 此文件仅服务器端可读，不对外暴露

define('SERVERS', [
    'hk' => [
        'name' => 'Hong Kong', 'flag' => '🇭🇰',
        'host' => 'hk.liukun.com', 'port' => 9528,
        'basePath' => '/admin_3x/',
        'username' => 'Gemini', 'password' => 'Gl5181081',
    ],
    'hk1' => [
        'name' => 'Hong Kong 1', 'flag' => '🇭🇰',
        'host' => 'hk1.liukun.com', 'port' => 9528,
        'basePath' => '/admin_3x/',
        'username' => 'Gemini', 'password' => 'Gl5181081',
    ],
    'sg' => [
        'name' => 'Singapore', 'flag' => '🇸🇬',
        'host' => 'sg.liukun.com', 'port' => 9528,
        'basePath' => '/admin_3x/',
        'username' => 'Gemini', 'password' => 'Gl5181081',
    ],
    'us' => [
        'name' => 'United States', 'flag' => '🇺🇸',
        'host' => 'us.liukun.com', 'port' => 9528,
        'basePath' => '/admin_3x/',
        'username' => 'Gemini', 'password' => 'Gl5181081',
    ],
]);

// Dashboard 访问凭据（与 3x-ui 一致）
define('DASH_USER', 'Gemini');
define('DASH_PASS', 'Gl5181081');
