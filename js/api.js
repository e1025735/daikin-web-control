// XHR wrappers around api.php (AC state) and timer.php (per-unit timers).
// All four functions read/write shared state and call into controls / timer_ui
// for view updates.

import { state, getActiveUnit_IP } from './state.js';
import { is_timer_enabled } from '../config.js';
import {
    control_response_handler,
    sensor_response_handler,
    set_alert,
    set_loading,
} from './controls.js';
import { timer_render_summary } from './timer_ui.js';

const TIMER_POLL_MS = 15000;

function any_request_loading() {
    return state.request_is_control_loading || state.request_is_sensor_loading;
}

export function request_control() {
    const ip = getActiveUnit_IP();
    if (!ip) return;

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;

        state.request_is_control_loading = false;
        set_loading(any_request_loading());

        if (xhr.status === 200) {
            set_alert(false, '');
            const json_response = JSON.parse(xhr.responseText);
            state.last_control_response = json_response;
            control_response_handler(json_response);
            state.control_timeout = setTimeout(request_control, state.refresh_interval_ms);
        } else {
            set_alert(true, 'Control ajax request to ' + ip + ' failed');
        }
    };
    xhr.open('GET', './api.php?uri=/aircon/get_control_info&unit_ip=' + encodeURIComponent(ip), true);
    xhr.send();
    state.request_is_control_loading = true;
    set_loading(true);
}

export function send_control(opts) {
    const ip = getActiveUnit_IP();
    if (!ip) return;

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) {
            set_alert(false, '');
            try { console.debug(JSON.parse(xhr.responseText)); } catch (e) {}
        } else {
            set_alert(true, 'Send control request to ' + ip + ' failed');
        }
    };
    xhr.open('POST', './api.php?unit_ip=' + encodeURIComponent(ip), true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.send(JSON.stringify(opts));
}

export function request_sensor() {
    const ip = getActiveUnit_IP();
    if (!ip) return;

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;

        state.request_is_sensor_loading = false;
        set_loading(any_request_loading());

        if (xhr.status === 200) {
            set_alert(false, '');
            const json_response = JSON.parse(xhr.responseText);
            state.last_sensor_response = json_response;
            sensor_response_handler(json_response);
            state.sensor_timeout = setTimeout(request_sensor, state.refresh_interval_ms);
        } else {
            set_alert(true, 'Sensor ajax request to ' + ip + ' failed');
        }
    };
    xhr.open('GET', './api.php?uri=/aircon/get_sensor_info&unit_ip=' + encodeURIComponent(ip), true);
    xhr.send();
    state.request_is_sensor_loading = true;
    set_loading(true);
}

export function request_timer() {
    if (!is_timer_enabled()) return;
    const ip = getActiveUnit_IP();
    if (!ip) return;

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) {
            try {
                state.last_timer_response = JSON.parse(xhr.responseText);
            } catch (e) {
                state.last_timer_response = { on: null, off: null };
            }
            timer_render_summary();
            clearTimeout(state.timer_refresh_timeout);
            state.timer_refresh_timeout = setTimeout(request_timer, TIMER_POLL_MS);
        }
    };
    xhr.open('GET', './timer.php?unit_ip=' + encodeURIComponent(ip), true);
    xhr.send();
}

// Cancel any pending polls and immediately re-fetch all three streams.
export function update() {
    clearTimeout(state.control_timeout);
    clearTimeout(state.sensor_timeout);
    if (!state.request_is_control_loading) request_control();
    if (!state.request_is_sensor_loading)  request_sensor();
    request_timer();
}
