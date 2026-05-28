<?php
/*
 * CLI worker (should be invoked once per minute)
 *
 * For every unit/slot whose fire_at has passed, send the captured payload
 * to the AC unit then null out the slot.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "timer_worker.php must be run from the CLI\n");
    exit(1);
}

require_once __DIR__ . '/daikin_client.php';
require_once __DIR__ . '/daikin_response_parser.php';
require_once __DIR__ . '/timer_store.php';

if (!timer_feature_enabled()) {
    exit(0);
}

$now = time();
$fired = [];

timer_store_modify(function (&$all) use ($now, &$fired) {
    foreach ($all as $unit_ip => $slots) {
        foreach (['on', 'off'] as $slot) {
            $entry = $slots[$slot] ?? null;
            if ($entry === null) continue;

            $fire_ts = strtotime($entry['fire_at'] ?? '');
            if ($fire_ts === false || $fire_ts > $now) continue;

            $payload = $entry['payload'] ?? null;
            if (!is_array($payload) || empty($payload)) {
                fwrite(STDERR, "[timer_worker] skipping $unit_ip/$slot: empty payload\n");
                $all[$unit_ip][$slot] = null;
                continue;
            }

            $fired[] = ['unit_ip' => $unit_ip, 'slot' => $slot, 'payload' => $payload];
            $all[$unit_ip][$slot] = null;
        }
    }
});

foreach ($fired as $job) {
    $when = date('c');
    try {
        $raw = daikin_post($job['unit_ip'], '/aircon/set_control_info', $job['payload']);
        daikin_response_parse_expecting_ok($raw);
        fwrite(STDOUT, "[$when] FIRED {$job['unit_ip']} {$job['slot']} -> $raw\n");
    } catch (RuntimeException $e) {
        fwrite(STDERR, "[$when] FAIL  {$job['unit_ip']} {$job['slot']} -> {$e->getMessage()}\n");
    }
}
