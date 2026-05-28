<?php
/*
 * Decoder for the `ret=OK,key=val,key2=val2` shape that the Daikin endpoint
 * returns.
 */

class DaikinParseException extends RuntimeException {}

function daikin_response_parse($raw) {
    if (!is_string($raw) || $raw === '') {
        throw new DaikinParseException('empty response');
    }
    $result = [];
    foreach (explode(',', $raw) as $pair) {
        if ($pair === '') continue;
        $eq = strpos($pair, '=');
        if ($eq === false) {
            throw new DaikinParseException("malformed pair without '=': $pair");
        }
        $key   = substr($pair, 0, $eq);
        $value = substr($pair, $eq + 1);
        $result[$key] = $value;
    }
    return $result;
}

function daikin_response_parse_expecting_ok($raw) {
    $parsed = daikin_response_parse($raw);
    $ret = $parsed['ret'] ?? '(missing)';
    if ($ret !== 'OK') {
        throw new DaikinParseException("device returned ret=$ret");
    }
    return $parsed;
}
