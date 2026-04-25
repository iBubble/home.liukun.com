<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$server = isset($_GET['server']) ? $_GET['server'] : 'ALL';
$semaphore_file = '/tmp/force_fetch_servers_stats';

$result = file_put_contents($semaphore_file, $server . "\n", FILE_APPEND | LOCK_EX);
if ($result !== false) {
    @chmod($semaphore_file, 0666);
    echo json_encode(['status' => 'success', 'message' => 'Signal sent for ' . $server]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to create signal file.']);
}
