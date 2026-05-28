<?php
/*
 * Thin HTTP glue between the browser and the Daikin wifi module.
 * Most code for this is in daikin_client.php (network I/O) and
 * daikin_response_parser.php (response decoding).
 */

require_once __DIR__ . '/daikin_client.php';
require_once __DIR__ . '/daikin_response_parser.php';
require_once __DIR__ . '/timer_store.php';

header('Content-Type: application/json');

$method  = $_SERVER['REQUEST_METHOD'];
$unit_ip = $_GET['unit_ip'] ?? '';

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['error' => 'request body must be a JSON object']);
        exit;
    }
    try {
        $raw    = daikin_post($unit_ip, '/aircon/set_control_info', $body);
        $parsed = daikin_response_parse($raw);
        echo json_encode($parsed);
    } catch (DaikinClientException $e) {
        http_response_code(503);
        echo json_encode(['error' => $e->getMessage()]);
    } catch (DaikinParseException $e) {
        http_response_code(502);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'GET') {
    $uri = $_GET['uri'] ?? '';
    if ($uri !== '/aircon/get_sensor_info' && $uri !== '/aircon/get_control_info') {
        http_response_code(405);
        echo json_encode(['error' => 'unsupported uri']);
        exit;
    }
    try {
        $raw    = daikin_get($unit_ip, $uri);
        $parsed = daikin_response_parse($raw);
        $json   = json_encode($parsed);
        if ($uri === '/aircon/get_control_info') {
            last_control_cache_write($unit_ip, $json);
        }
        echo $json;
    } catch (DaikinClientException $e) {
        http_response_code(503);
        echo json_encode(['error' => $e->getMessage()]);
    } catch (DaikinParseException $e) {
        http_response_code(502);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
