<?php
/*
 * CLI worker (should be invoked once per minute)
 *
 * For every unit/slot whose fire_at has passed, send the captured payload
 * to the AC unit via the same set_array_info() the web UI uses, then null
 * out the slot.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "timer_worker.php must be run from the CLI\n");
    exit(1);
}

require_once __DIR__ . '/engine.php';
require_once __DIR__ . '/timer_store.php';

// If timer featue is not wanted we kill this to not use any cpu
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
    $result = set_array_info('/aircon/set_control_info', $job['unit_ip'], $job['payload']);
    $when = date('c');
    if ($result === false) {
        fwrite(STDERR, "[$when] FAIL  {$job['unit_ip']} {$job['slot']}\n");
    } else {
        fwrite(STDOUT, "[$when] FIRED {$job['unit_ip']} {$job['slot']} -> $result\n");
    }
}
