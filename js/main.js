// Entry point. Wires up event listeners (no inline onclicks in index.html),
// renders the unit buttons from config, and kicks off the polling loop.

import { config, is_timer_enabled, is_spinner_enabled } from '../config.js';
import { state } from './state.js';
import { init_theme, set_theme } from './theme.js';
import { init_units } from './units.js';
import { update } from './api.js';
import {
    mode_onclick,
    power_onclick,
    fan_onclick,
    wing_onclick,
    temp_onclick,
    resetTemp_onclick,
} from './controls.js';
import {
    timer_open_dialog,
    timer_close_dialog,
    timer_set_mode,
    timer_save,
    timer_clear,
    timer_render_summary,
    start_timer_countdown_ticker,
} from './timer_ui.js';

state.refresh_interval_ms = config.refreshInterval;

init_theme();
init_units(on_unit_changed);

if (!is_timer_enabled()) {
    const tc = document.querySelector('.timer-container');
    if (tc) tc.style.display = 'none';
}

if (!is_spinner_enabled()) {
    // Hide the navbar spinner entirely; set_loading() then has no visible
    // effect even though api.js keeps calling it.
    const sp = document.getElementById('spinner');
    if (sp) sp.style.display = 'none';
}

wire_static_listeners();
wire_delegated_listeners();
wire_timer_dialog_listeners();

start_timer_countdown_ticker();
update();

function on_unit_changed() {
    state.last_timer_response = { on: null, off: null };
    timer_render_summary();
    update();
}

function wire_static_listeners() {
    document.getElementById('themeAuto') .addEventListener('click', () => set_theme('auto'));
    document.getElementById('themeLight').addEventListener('click', () => set_theme('light'));
    document.getElementById('themeDark') .addEventListener('click', () => set_theme('dark'));

    document.getElementById('powerBtn').addEventListener('click', power_onclick);
    document.getElementById('timerBtn').addEventListener('click', timer_open_dialog);

    // Clicking anywhere on the temperature read-out forces a sensor refresh.
    const temp_container = document.querySelector('.temp-container');
    if (temp_container) temp_container.addEventListener('click', resetTemp_onclick);

    // Dismiss the close (X), the backdrop, and the footer "Close" button.
    document.querySelectorAll('[data-timer-close]').forEach(function (el) {
        el.addEventListener('click', timer_close_dialog);
    });

    document.getElementById('alertClose').addEventListener('click', function () {
        document.getElementById('alert').classList.add('visually-hidden');
    });
}

// Each .btn-group on the main page maps one data-* attribute to one handler.
function wire_delegated_listeners() {
    delegate('#mode-group',        '[data-mode]',       (btn) => mode_onclick(btn.dataset.mode));
    delegate('#fan-group',         '[data-fan-rate]',   (btn) => fan_onclick(btn.dataset.fanRate));
    delegate('#wing-group',        '[data-wing-dir]',   (btn) => wing_onclick(btn.dataset.wingDir));
    delegate('#target-temp-group', '[data-temp-delta]', (btn) => temp_onclick(parseFloat(btn.dataset.tempDelta)));
}

function wire_timer_dialog_listeners() {
    // Relative vs absolute mode toggles per slot.
    document.querySelectorAll('.timer-mode-btn').forEach(function (el) {
        el.addEventListener('click', function () {
            timer_set_mode(el.dataset.slot, el.dataset.mode);
        });
    });

    // Save / clear actions per slot.
    document.querySelectorAll('[data-timer-save]').forEach(function (el) {
        el.addEventListener('click', () => timer_save(el.dataset.timerSave));
    });
    document.querySelectorAll('[data-timer-clear]').forEach(function (el) {
        el.addEventListener('click', () => timer_clear(el.dataset.timerClear));
    });
}

function delegate(container_selector, target_selector, handler) {
    const container = document.querySelector(container_selector);
    if (!container) return;
    container.addEventListener('click', function (e) {
        const btn = e.target.closest(target_selector);
        if (btn && container.contains(btn)) handler(btn);
    });
}
