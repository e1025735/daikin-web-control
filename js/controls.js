// Click handlers, view setters, and response handlers for the main
// control panel

import { state } from './state.js';
import { send_control, update } from './api.js';
import {
    MODE,
    MODE_AUTO_VALUES,
    MODE_BUTTON_ID,
    F_RATE,
    F_DIR,
    STEMP_RANGE,
    DEGREES,
} from './constants.js';

// Restrict an outgoing payload to the keys /aircon/set_control_info accepts
const CONTROL_KEYS = ['unit', 'pow', 'mode', 'stemp', 'shum', 'f_rate', 'f_dir'];

export function minimize_opt(opt) {
    const out = {};
    if (!opt) return out;
    CONTROL_KEYS.forEach(function (k) {
        if (opt[k] !== undefined) out[k] = opt[k];
    });
    return out;
}

function normalize_mode(m) {
    return MODE_AUTO_VALUES.includes(m) ? MODE.AUTO : m;
}

//---------- Click handlers ----------
export function mode_onclick(str_mode) {
    if (!state.last_control_response) return;
    const last = state.last_control_response;
    const options = minimize_opt(last);
    options.unit   = last['dfu' + str_mode];
    options.mode   = str_mode;
    options.f_rate = last['dfr' + str_mode];
    options.f_dir  = last['dfd' + str_mode];
    options.shum   = '0';
    options.stemp  = (str_mode === MODE.FAN) ? '0' : last['dt' + str_mode];
    send_control(options);
    update();
}

export function power_onclick() {
    if (!state.last_control_response) return;
    const options = minimize_opt(state.last_control_response);
    options.pow = (options.pow === '0') ? '1' : '0';
    send_control(options);
    update();
}

export function fan_onclick(num_fan_level) {
    if (!state.last_control_response) return;
    const options = minimize_opt(state.last_control_response);
    options.f_rate = num_fan_level;
    send_control(options);
    update();
}

export function wing_onclick(num_wing_mode) {
    if (!state.last_control_response) return;
    const options = minimize_opt(state.last_control_response);
    // Re-clicking the active direction stops the wings.
    options.f_dir = (num_wing_mode === state.last_control_response.f_dir)
        ? F_DIR.STOPPED
        : num_wing_mode;
    send_control(options);
    update();
}

export function temp_onclick(float_delta) {
    if (!state.last_control_response) return;
    const options = minimize_opt(state.last_control_response);
    options.stemp = (parseFloat(state.last_control_response.stemp) + float_delta).toString();
    send_control(options);
    update();
}

export function resetTemp_onclick() {
    // Force a sensor refresh.
    state.request_is_sensor_loading = false;
    update();
}

//---------- Response handlers ----------
export function control_response_handler(json_response) {
    reset_wing();
    reset_fan();
    reset_mode();

    const target_temp = parseFloat(json_response.stemp).toFixed(1);
    update_target_temp_arrows(json_response.mode, parseFloat(target_temp));

    set_target_temp(target_temp);
    set_power(Boolean(parseInt(json_response.pow, 10)));
    set_mode(json_response.mode);

    set_fan_from_rate(json_response.f_rate);
    set_wing(parseInt(json_response.f_dir, 10));
}

export function sensor_response_handler(json_response) {
    set_home_temp(parseInt(json_response.htemp, 10));
    set_outside_temp(parseInt(json_response.otemp, 10));
}

function set_fan_from_rate(f_rate) {
    if (f_rate === F_RATE.AUTO) {
        set_fan(1);
    } else if (f_rate === F_RATE.SILENCE) {
        set_fan(2);
    } else {
        set_fan(parseInt(f_rate, 10));
    }
}

function update_target_temp_arrows(mode_value, target_temp) {
    const range = STEMP_RANGE[normalize_mode(mode_value)];
    const min = range && range.min !== null ? range.min : -Infinity;
    const max = range && range.max !== null ? range.max : Infinity;
    set_target_temp_arrow(true,  target_temp < max);   // up
    set_target_temp_arrow(false, target_temp > min);   // down
}

//---------- View setters ----------
export function set_alert(has_alert, message) {
    const el = document.getElementById('alert');
    if (has_alert) {
        el.classList.remove('visually-hidden');
        el.lastElementChild.innerHTML = '<b>Error:</b> ' + message;
    } else {
        el.classList.add('visually-hidden');
    }
}

// Control + sensor + timer XHRs complete at slightly different times, so a
// naive on/off toggle blinks the spinner once per request (= twice per
// poll cycle). We debounce the "off" transition so consecutive requests
// coalesce into a single visible spin.
let _loading_off_timeout = null;
const LOADING_OFF_DEBOUNCE_MS = 300;

export function set_loading(is_loading) {
    const spinner = document.getElementById('spinner');
    if (!spinner) return;
    if (is_loading) {
        if (_loading_off_timeout !== null) {
            clearTimeout(_loading_off_timeout);
            _loading_off_timeout = null;
        }
        spinner.classList.remove('visually-hidden');
    } else {
        if (_loading_off_timeout !== null) clearTimeout(_loading_off_timeout);
        _loading_off_timeout = setTimeout(function () {
            spinner.classList.add('visually-hidden');
            _loading_off_timeout = null;
        }, LOADING_OFF_DEBOUNCE_MS);
    }
}

export function set_power(is_on) {
    const power = document.getElementById('power');
    const icon  = document.getElementById('powerIcn');
    const btn   = document.getElementById('powerBtn');
    power.textContent = is_on ? ' ON' : ' OFF';
    btn.classList.toggle('btn-info',  is_on);
    btn.classList.toggle('btn-light', !is_on);
    icon.style.color = is_on ? 'green' : 'red';
}

function reset_mode() {
    document.querySelectorAll('.mode-btn.btn-info').forEach(function (el) {
        el.classList.remove('btn-info');
        el.classList.add('btn-light');
    });
}

export function set_mode(mode_value) {
    const id = MODE_BUTTON_ID[String(mode_value)];
    if (!id) {
        console.warn('set_mode(): unknown mode value', mode_value);
        return;
    }
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.remove('btn-light');
    btn.classList.add('btn-info');
}

export function set_home_temp(num_temp) {
    document.getElementById('home_temp').textContent = ' ' + num_temp + DEGREES + 'C';
}

export function set_outside_temp(num_temp) {
    document.getElementById('outside_temp').textContent = ' ' + num_temp + DEGREES + 'C';
}

export function set_target_temp(num_temp) {
    const el = document.getElementById('target_temp');
    if (isNaN(num_temp)) {
        show_target_temp(false);
        el.textContent = ' ~ ';
    } else {
        el.textContent = ' ' + num_temp + DEGREES + 'C';
        show_target_temp(true);
    }
}

function show_target_temp(visible) {
    document.getElementById('target_temp_col').classList.toggle('visually-hidden', !visible);
}

function set_target_temp_arrow(is_up, enabled) {
    const arrow = document.getElementById(is_up ? 'target_temp_up' : 'target_temp_down');
    arrow.classList.toggle('disabled', !enabled);
}

function reset_fan() {
    document.querySelectorAll('.fan-btn').forEach(function (el) {
        el.classList.remove('btn-info');
        el.classList.add('btn-light');
    });
    set_fan_level_img(0);
}

function set_fan(fan_index) {
    switch (fan_index) {
        case 1: document.getElementById('fan_auto').classList.add('btn-info'); document.getElementById('fan_auto').classList.remove('btn-light'); break;
        case 2: document.getElementById('fan_eco').classList.add('btn-info');  document.getElementById('fan_eco').classList.remove('btn-light');  break;
        case 3: set_fan_level_img(1); break;
        case 4: set_fan_level_img(2); break;
        case 5: set_fan_level_img(3); break;
        case 6: set_fan_level_img(4); break;
        case 7: set_fan_level_img(5); break;
        default: console.warn('set_fan(): unknown fan_index', fan_index);
    }
}

function set_fan_level_img(highest_active_level) {
    for (let i = 1; i <= 5; i++) {
        const img = document.getElementById('fan_lvl_' + i);
        img.src = 'media/level_' + i + (i <= highest_active_level ? '_on' : '_off') + '.svg';
    }
}

function reset_wing() {
    document.querySelectorAll('.wing-btn').forEach(function (el) {
        el.classList.remove('btn-info');
        el.classList.add('btn-light');
    });
}

function set_wing(num_wing_mode) {
    const map = {
        0: 'wing_s',
        1: 'wing_v',
        2: 'wing_h',
        3: 'wing_b',
    };
    const id = map[num_wing_mode];
    if (!id) {
        console.warn('set_wing(): unknown wing mode', num_wing_mode);
        return;
    }
    const el = document.getElementById(id);
    el.classList.remove('btn-light');
    el.classList.add('btn-info');
}
