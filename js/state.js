// Shared mutable state so that modules import this object and read/write its fields

export const state = {
    last_control_response: null,
    last_sensor_response: null,
    last_timer_response: { on: null, off: null },
    active_unit_id: 1,
    vars: {},
    request_is_control_loading: false,
    request_is_sensor_loading: false,
    refresh_interval_ms: 2000,
    control_timeout: null,
    sensor_timeout: null,
    timer_refresh_timeout: null,
    timer_countdown_interval: null,
    usage_cache: {},
};

export function getActiveUnit_IP() {
    return state.vars['unit' + state.active_unit_id + 'IP'];
}

export function getActiveUnit_Name() {
    return state.vars['unit' + state.active_unit_id + 'Name'] || '';
}
