// Per-unit ON/OFF timer UI: header summary, modal dialog, save/clear actions.

import { state, getActiveUnit_IP, getActiveUnit_Name } from './state.js';
import { is_timer_enabled } from '../config.js';
import { minimize_opt, set_alert } from './controls.js';
import { request_timer } from './api.js';

const COUNTDOWN_TICK_MS = 30000;
const MAX_AHEAD_MS = 24 * 3600 * 1000;

//---------- Short info for button on main page ----------
export function timer_render_summary() {
    const on  = state.last_timer_response && state.last_timer_response.on;
    const off = state.last_timer_response && state.last_timer_response.off;

    const on_label   = document.getElementById('timerOnLabel');
    const off_label  = document.getElementById('timerOffLabel');
    const none_label = document.getElementById('timerNoneLabel');
    const btn        = document.getElementById('timerBtn');

    if (!on && !off) {
        on_label.classList.add('visually-hidden');
        off_label.classList.add('visually-hidden');
        none_label.classList.remove('visually-hidden');
        btn.classList.remove('btn-info');
        btn.classList.add('btn-light');
        return;
    }

    none_label.classList.add('visually-hidden');
    btn.classList.remove('btn-light');
    btn.classList.add('btn-info');

    render_summary_slot(on_label,  on,  'timerOnCountdown',  'ON');
    render_summary_slot(off_label, off, 'timerOffCountdown', 'OFF');
}

function render_summary_slot(label_el, entry, countdown_id, label_text) {
    if (!entry) {
        label_el.classList.add('visually-hidden');
        return;
    }
    label_el.classList.remove('visually-hidden');
    label_el.title = label_text + ' at ' + format_absolute(entry.fire_at);
    document.getElementById(countdown_id).textContent = format_relative(entry.fire_at);
}

export function start_timer_countdown_ticker() {
    if (state.timer_countdown_interval) return;
    state.timer_countdown_interval = setInterval(function () {
        if (state.last_timer_response && (state.last_timer_response.on || state.last_timer_response.off)) {
            timer_render_summary();
        }
    }, COUNTDOWN_TICK_MS);
}

function format_relative(iso) {
    const target = new Date(iso).getTime();
    const diff_s = Math.max(0, Math.round((target - Date.now()) / 1000));
    if (diff_s === 0) return 'now';

    const h = Math.floor(diff_s / 3600);
    const m = Math.ceil((diff_s % 3600) / 60);

    if (m === 60)            return 'in ' + (h + 1) + 'h';
    if (h > 0 && m > 0)      return 'in ' + h + 'h ' + m + 'm';
    if (h > 0)               return 'in ' + h + 'h';
    return 'in ' + m + 'm';
}

function format_absolute(iso) {
    const d  = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const is_tomorrow = d.getDate() !== new Date().getDate();
    return hh + ':' + mm + (is_tomorrow ? ' (tomorrow)' : '');
}

//---------- Modal dialog ----------
export function timer_open_dialog() {
    if (!is_timer_enabled()) return;
    document.getElementById('timerModalUnit').textContent = getActiveUnit_Name();

    // Pre-populate the absolute-time inputs with "now + an hour" as a sensible default.
    const default_abs = new Date(Date.now() + 60 * 60 * 1000);
    const hh = String(default_abs.getHours()).padStart(2, '0');
    const mm = String(default_abs.getMinutes()).padStart(2, '0');
    document.getElementById('timerOnAbs').value  = hh + ':' + mm;
    document.getElementById('timerOffAbs').value = hh + ':' + mm;

    timer_render_dialog_current('on',  state.last_timer_response && state.last_timer_response.on);
    timer_render_dialog_current('off', state.last_timer_response && state.last_timer_response.off);

    document.getElementById('timerModal').classList.remove('visually-hidden');
    document.getElementById('timerModalBackdrop').classList.remove('visually-hidden');
    document.body.classList.add('timer-modal-open');
    document.addEventListener('keydown', timer_dialog_escape);
}

export function timer_close_dialog() {
    document.getElementById('timerModal').classList.add('visually-hidden');
    document.getElementById('timerModalBackdrop').classList.add('visually-hidden');
    document.body.classList.remove('timer-modal-open');
    document.removeEventListener('keydown', timer_dialog_escape);
}

function timer_dialog_escape(e) {
    if (e.key === 'Escape') timer_close_dialog();
}

function timer_render_dialog_current(slot, entry) {
    const cap = slot[0].toUpperCase() + slot.slice(1);
    const cur_el    = document.getElementById('timer' + cap + 'Current');
    const clear_btn = document.getElementById('timer' + cap + 'ClearBtn');
    if (entry) {
        cur_el.classList.remove('visually-hidden');
        cur_el.innerHTML = '<i class="fa fa-circle-info"></i> currently set for '
            + format_absolute(entry.fire_at) + ' (' + format_relative(entry.fire_at) + ')';
        clear_btn.classList.remove('disabled');
    } else {
        cur_el.classList.add('visually-hidden');
        clear_btn.classList.add('disabled');
    }
}

export function timer_set_mode(slot, mode) {
    document.querySelectorAll('.timer-mode-btn[data-slot="' + slot + '"]').forEach(function (el) {
        el.classList.toggle('active', el.dataset.mode === mode);
    });
    document.querySelectorAll('.timer-entry[data-slot="' + slot + '"]').forEach(function (el) {
        el.classList.toggle('visually-hidden', !el.classList.contains('timer-entry-' + mode));
    });
}

function timer_compute_fire_at(slot) {
    const active = document.querySelector('.timer-mode-btn.active[data-slot="' + slot + '"]');
    const mode   = active ? active.dataset.mode : 'relative';
    const prefix = 'timer' + slot[0].toUpperCase() + slot.slice(1);

    if (mode === 'relative') {
        const h = parseInt(document.getElementById(prefix + 'RelHours').value,   10) || 0;
        const m = parseInt(document.getElementById(prefix + 'RelMinutes').value, 10) || 0;
        if (h === 0 && m === 0) return null;
        return new Date(Date.now() + (h * 3600 + m * 60) * 1000);
    }

    const v = document.getElementById(prefix + 'Abs').value;
    if (!v) return null;
    const parts = v.split(':');
    const target = new Date();
    target.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
    return target;
}

export function timer_save(slot) {
    if (!is_timer_enabled()) return;
    if (!state.last_control_response) {
        set_alert(true, 'Cannot set timer: AC state not yet loaded');
        return;
    }
    const fire_at = timer_compute_fire_at(slot);
    if (!fire_at) {
        set_alert(true, 'Pick a duration or a time first');
        return;
    }
    if (fire_at.getTime() > Date.now() + MAX_AHEAD_MS) {
        set_alert(true, 'Timers can only be set up to 24 hours in advance');
        return;
    }

    const payload = minimize_opt(state.last_control_response);
    payload.pow = (slot === 'on') ? '1' : '0';

    const body = JSON.stringify({ fire_at: fire_at.toISOString(), payload });
    const ip = getActiveUnit_IP();

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) {
            set_alert(false, '');
            request_timer();
            timer_close_dialog();
        } else {
            let msg = 'Failed to set ' + slot.toUpperCase() + ' timer';
            try {
                const err = JSON.parse(xhr.responseText);
                if (err && err.error) msg += ': ' + err.error;
            } catch (e) {}
            set_alert(true, msg);
        }
    };
    xhr.open('POST', './timer.php?unit_ip=' + encodeURIComponent(ip) + '&slot=' + slot, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(body);
}

export function timer_clear(slot) {
    if (!is_timer_enabled()) return;
    const ip = getActiveUnit_IP();

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) {
            set_alert(false, '');
            request_timer();
            timer_render_dialog_current(slot, null);
        } else {
            set_alert(true, 'Failed to clear ' + slot.toUpperCase() + ' timer');
        }
    };
    xhr.open('DELETE', './timer.php?unit_ip=' + encodeURIComponent(ip) + '&slot=' + slot, true);
    xhr.send();
}
