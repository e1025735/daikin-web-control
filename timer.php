<?php
/*
 * REST endpoints for one-shot per-unit ON/OFF timers.
 *
 * Storage: data/timers.json, keyed by unit IP, with independent
 *   "on" and "off" slots. Each slot carries fire_at (ISO-8601 with offset),
 *   created_at, and the minimized control payload captured when the timer
 *   was set. Therefore an ON timer fires with the values the user saw at set time.
 *
 * Concurrency: every read/modify/write goes through flock() to keep the
 *   cron-driven timer_worker.php from racing the web requests.
 *
 * GET    /timer.php?unit_ip=…                  -> { "on": {...}|null, "off": {...}|null }
 * POST   /timer.php?unit_ip=…&slot=on|off      body: { "fire_at": ISO8601, "payload": {...} }
 * DELETE /timer.php?unit_ip=…&slot=on|off
 */

require_once __DIR__ . '/timer_store.php';

header('Content-Type: application/json');

if (!timer_feature_enabled()) {
    http_response_code(503);
    echo json_encode(['error' => 'timer feature disabled in config.js']);
    exit;
}

$method  = $_SERVER['REQUEST_METHOD'];
$unit_ip = $_GET['unit_ip'] ?? '';
$slot    = $_GET['slot']    ?? '';

if ($unit_ip === '') {
    http_response_code(400);
    echo json_encode(['error' => 'missing or invalid unit_ip']);
    exit;
}

if ($method === 'GET') {
    $all = timer_store_read();
    $for_unit = $all[$unit_ip] ?? ['on' => null, 'off' => null];
    echo json_encode($for_unit);
    exit;
}

if ($slot !== 'on' && $slot !== 'off') {
    http_response_code(400);
    echo json_encode(['error' => 'slot must be "on" or "off"']);
    exit;
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || empty($body['fire_at']) || empty($body['payload'])) {
        http_response_code(400);
        echo json_encode(['error' => 'body requires fire_at and payload']);
        exit;
    }

    $fire_ts = strtotime($body['fire_at']);
    if ($fire_ts === false) {
        http_response_code(400);
        echo json_encode(['error' => 'fire_at is not a valid ISO-8601 timestamp']);
        exit;
    }

    $now = time();
    if ($fire_ts <= $now) {
        http_response_code(400);
        echo json_encode(['error' => 'fire_at must be in the future']);
        exit;
    }
    if ($fire_ts > $now + 24 * 3600) {
        http_response_code(400);
        echo json_encode(['error' => 'fire_at must be at most 24 hours in the future']);
        exit;
    }

    // Force pow to match the slot — guards against a client sending mismatched payload.
    $payload = $body['payload'];
    $payload['pow'] = ($slot === 'on') ? '1' : '0';

    timer_store_modify(function (&$all) use ($unit_ip, $slot, $body, $payload, $now) {
        if (!isset($all[$unit_ip])) {
            $all[$unit_ip] = ['on' => null, 'off' => null];
        }
        $all[$unit_ip][$slot] = [
            'fire_at'    => date('c', strtotime($body['fire_at'])),
            'created_at' => date('c', $now),
            'payload'    => $payload,
        ];
    });

    echo json_encode(['ok' => true]);
    exit;
}

if ($method === 'DELETE') {
    timer_store_modify(function (&$all) use ($unit_ip, $slot) {
        if (isset($all[$unit_ip])) {
            $all[$unit_ip][$slot] = null;
        }
    });
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
