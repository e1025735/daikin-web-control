<?php
class DaikinClientException extends RuntimeException {}

function daikin_get($ip, $uri, $timeout_seconds = 5) {
    return daikin_request($ip, $uri, null, $timeout_seconds);
}

function daikin_post($ip, $uri, array $params, $timeout_seconds = 5) {
    return daikin_request($ip, $uri, $params, $timeout_seconds);
}

function daikin_request($ip, $uri, $params, $timeout_seconds) {
    $url = sprintf('http://%s%s', $ip, $uri);
    if ($params !== null && $params !== []) {
        $url .= '?' . http_build_query($params);
    }

    $ctx = stream_context_create([
        'http' => [
            'method'        => 'GET',
            'timeout'       => $timeout_seconds,   // read timeout
            'ignore_errors' => true,               // give us the body even on 4xx/5xx
        ],
    ]);

        $prev_socket_timeout = ini_get('default_socket_timeout');
        ini_set('default_socket_timeout', (string) $timeout_seconds);
        error_clear_last();
        $body = @file_get_contents($url, false, $ctx);
        ini_set('default_socket_timeout', $prev_socket_timeout);

    if ($body === false) {
        $err = error_get_last();
        $detail = ($err && isset($err['message'])) ? ': ' . $err['message'] : '';
        throw new DaikinClientException("network error talking to $ip$detail");
    }

    $code = 0;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $h) {
            if (preg_match('#^HTTP/\S+\s+(\d+)#', $h, $m)) {
                $code = (int) $m[1];
            }
        }
    }
    if ($code !== 0 && ($code < 200 || $code >= 300)) {
        throw new DaikinClientException("device $ip returned HTTP $code");
    }
    return $body;
}
