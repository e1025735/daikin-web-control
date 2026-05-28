<?php
/*
 * Shared file-backed timer store. All access is guarded by flock() so the
 * cron worker (timer_worker.php) and the web request handlers (timer.php,
 * api.php's last-control cache) never tear each other's writes.
 *
 * Writes go through a `*.tmp` + rename(), so a crash mid-write can't truncate
 * the existing file.
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

    $lock_fp = fopen($path, 'c+');
    if (!$lock_fp) {
        throw new RuntimeException("cannot open timer store at $path");
    }
    flock($lock_fp, LOCK_EX);
    rewind($lock_fp);
    $raw = stream_get_contents($lock_fp);
    $all = json_decode($raw, true);
    if (!is_array($all)) $all = [];

    $mutator($all);

    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, json_encode($all, JSON_PRETTY_PRINT), LOCK_EX) === false) {
        flock($lock_fp, LOCK_UN);
        fclose($lock_fp);
        throw new RuntimeException("cannot write timer store tmp file at $tmp");
    }
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        flock($lock_fp, LOCK_UN);
        fclose($lock_fp);
        throw new RuntimeException("cannot rename $tmp to $path");
    }

    flock($lock_fp, LOCK_UN);
    fclose($lock_fp);
}

function last_control_cache_path($unit_ip) {
    $safe = preg_replace('/[^0-9.]/', '_', $unit_ip);
    return timer_store_data_dir() . "/last_control_$safe.json";
}

function last_control_cache_write($unit_ip, $json_string) {
    $path = last_control_cache_path($unit_ip);
    $tmp  = $path . '.tmp';
    if (file_put_contents($tmp, $json_string, LOCK_EX) === false) {
        error_log("last_control_cache_write: cannot write $tmp");
        return;
    }
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        error_log("last_control_cache_write: cannot rename $tmp to $path");
    }
}

function last_control_cache_read($unit_ip) {
    $path = last_control_cache_path($unit_ip);
    if (!file_exists($path)) return null;
    $raw = @file_get_contents($path);
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}
