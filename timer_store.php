<?php
/*
 * Shared file-backed timer store. All access is guarded by flock() so the
 * cron worker (timer_worker.php) and the web request handlers (timer.php,
 * api.php's last-control cache) never tear each other's writes.
 */

/*
 * Check the enableTimer flag in config.js. Default to true (feature enabled)
 * if config.js is missing or the flag isn't present, so existing deployments
 * keep working after upgrade without a config change.
 */
function timer_feature_enabled() {
    $path = __DIR__ . '/config.js';
    $content = @file_get_contents($path);
    if ($content === false) return true;
    return !preg_match('/enableTimer\s*:\s*false/i', $content);
}

function timer_store_data_dir() {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        // suppress warnings; mkdir may race with another request.
        @mkdir($dir, 0775, true);
    }
    return $dir;
}

function timer_store_path() {
    return timer_store_data_dir() . '/timers.json';
}

function timer_store_read() {
    $path = timer_store_path();
    if (!file_exists($path)) {
        return [];
    }
    $fp = fopen($path, 'r');
    if (!$fp) return [];
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function timer_store_modify(callable $mutator) {
    $path = timer_store_path();
    $fp = fopen($path, 'c+');
    if (!$fp) {
        throw new RuntimeException("cannot open timer store at $path");
    }
    flock($fp, LOCK_EX);
    rewind($fp);
    $raw = stream_get_contents($fp);
    $all = json_decode($raw, true);
    if (!is_array($all)) $all = [];

    $mutator($all);

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($all, JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

function last_control_cache_path($unit_ip) {
    $safe = preg_replace('/[^0-9.]/', '_', $unit_ip);
    return timer_store_data_dir() . "/last_control_$safe.json";
}

function last_control_cache_write($unit_ip, $json_string) {
    if (!filter_var($unit_ip, FILTER_VALIDATE_IP)) return;
    $path = last_control_cache_path($unit_ip);
    $fp = fopen($path, 'c+');
    if (!$fp) return;
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, $json_string);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

function last_control_cache_read($unit_ip) {
    $path = last_control_cache_path($unit_ip);
    if (!file_exists($path)) return null;
    $raw = @file_get_contents($path);
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}
