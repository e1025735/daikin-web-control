// Usage tab. Tries the `_ex` endpoints first (BRP069B4x+, gives per-mode kWh)
// and falls back to the plain endpoints (older firmware, runtime minutes only)
// if those 404. Each section (Today / Week / Year) degrades independently.
//
// `_ex` response shapes (slash-separated, values in 0.1 kWh units):
//   get_week_power_ex:  s_dayw, week_heat[14], week_cool[14]
//       Each array has 14 entries: index 0 = today, index 1 = yesterday,
//       ..., index 6 = 6 days ago. Index 7 = same weekday last week,
//       index 13 = 13 days ago. So [0..6] = this week, [7..13] = last week.
//   get_year_power_ex:  curr_year_heat[12], prev_year_heat[12],
//                       curr_year_cool[12], prev_year_cool[12]
//       12 monthly values per field, Jan → Dec (assumed).
//
// Plain response shapes (runtime in minutes):
//   get_week_power:     today_runtime, datas[7]   (7 days, kept as fallback)
//   get_year_power:     this_year[12], previous_year[12]  (hours)

import { state, getActiveUnit_IP } from './state.js';
import {
    request_week_power,
    request_year_power,
    request_week_power_ex,
    request_year_power_ex,
} from './api.js';

const NOT_SUPPORTED_MSG = 'Not supported by this unit.';
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let initialized = false;

export function init_usage() {
    if (initialized) return;
    initialized = true;

    document.getElementById('usageRefreshBtn').addEventListener('click', function () {
        const ip = getActiveUnit_IP();
        if (ip) fetch_and_render(ip);
    });

    document.querySelectorAll('.usage-accordion-header').forEach(function (h) {
        h.addEventListener('click', function () {
            const acc = h.closest('.usage-accordion');
            const is_collapsed = acc.classList.toggle('collapsed');
            h.setAttribute('aria-expanded', is_collapsed ? 'false' : 'true');
        });
    });
}

export function on_usage_tab_shown() {
    const ip = getActiveUnit_IP();
    if (!ip) return;
    const cached = state.usage_cache[ip];
    if (cached) render_from_cache(cached);
    else        fetch_and_render(ip);
}

export function on_unit_changed_usage() {
    const usage_pill = document.querySelector('.tab-pill[data-tab="usage"]');
    if (!usage_pill || !usage_pill.classList.contains('active')) {
        reset_to_placeholders();
        return;
    }
    on_usage_tab_shown();
}

function fetch_and_render(ip) {
    set_loading_all();
    if (!state.usage_cache[ip]) state.usage_cache[ip] = {};
    const entry = state.usage_cache[ip];

    // Week (+ Today): try _ex, then plain.
    request_week_power_ex(
        function (data) {
            entry.week = { mode: 'ex', data: data };
            entry.week_error = null;
            render_today(entry.week);
            render_week(entry.week);
            bump_fetched(entry);
        },
        function () {
            request_week_power(
                function (data) {
                    entry.week = { mode: 'plain', data: data };
                    entry.week_error = null;
                    render_today(entry.week);
                    render_week(entry.week);
                    bump_fetched(entry);
                },
                function () {
                    entry.week = null;
                    entry.week_error = NOT_SUPPORTED_MSG;
                    render_not_supported('usageToday');
                    render_not_supported('usageWeek');
                    bump_fetched(entry);
                }
            );
        }
    );

    request_year_power_ex(
        function (data) {
            entry.year = { mode: 'ex', data: data };
            entry.year_error = null;
            render_year(entry.year);
            bump_fetched(entry);
        },
        function () {
            request_year_power(
                function (data) {
                    entry.year = { mode: 'plain', data: data };
                    entry.year_error = null;
                    render_year(entry.year);
                    bump_fetched(entry);
                },
                function () {
                    entry.year = null;
                    entry.year_error = NOT_SUPPORTED_MSG;
                    render_not_supported('usageYear');
                    bump_fetched(entry);
                }
            );
        }
    );
}

function bump_fetched(entry) {
    entry.fetched_at = Date.now();
    update_fetched_label(entry.fetched_at);
}

function render_from_cache(entry) {
    if (entry.week)             { render_today(entry.week); render_week(entry.week); }
    else if (entry.week_error)  { render_not_supported('usageToday'); render_not_supported('usageWeek'); }
    else                        { render_placeholder('usageToday'); render_placeholder('usageWeek'); }

    if (entry.year)             render_year(entry.year);
    else if (entry.year_error)  render_not_supported('usageYear');
    else                        render_placeholder('usageYear');

    update_fetched_label(entry.fetched_at);
}

function reset_to_placeholders() {
    render_placeholder('usageToday');
    render_placeholder('usageWeek');
    render_placeholder('usageYear');
    update_fetched_label(null);
}

function set_loading_all() {
    set_text('usageToday', 'Loading…');
    set_text('usageWeek',  'Loading…');
    set_text('usageYear',  'Loading…');
}

function set_text(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'usage-placeholder text-muted';
    p.textContent = text;
    el.appendChild(p);
}

function render_placeholder(id) { set_text(id, 'Tap Refresh to load.'); }

function render_not_supported(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'usage-not-supported';
    p.textContent = NOT_SUPPORTED_MSG;
    el.appendChild(p);
}

function render_today(week) {
    const el = document.getElementById('usageToday');
    if (!el) return;
    el.innerHTML = '';

    if (week.mode === 'ex') {
        // _ex: 14 values per field, index 0 = today, 1 = yesterday, 7 = same weekday last week.
        const heat = parse_seq(week.data.week_heat).map(ten_to_kwh);
        const cool = parse_seq(week.data.week_cool).map(ten_to_kwh);
        const today_total       = (cool[0] || 0) + (heat[0] || 0);
        const yest_total        = (cool[1] || 0) + (heat[1] || 0);
        const last_week_total   = (cool[7] || 0) + (heat[7] || 0);

        const big = document.createElement('p');
        big.className = 'usage-today-value';
        big.textContent = format_kwh(today_total) + ' today';
        el.appendChild(big);

        const sub = document.createElement('p');
        sub.className = 'usage-today-sub';
        sub.innerHTML =
            '<span class="usage-swatch usage-swatch-cool"></span> ' + format_kwh(cool[0] || 0) + ' cool · ' +
            '<span class="usage-swatch usage-swatch-heat"></span> ' + format_kwh(heat[0] || 0) + ' heat';
        el.appendChild(sub);

        const compare = document.createElement('p');
        compare.className = 'usage-today-comparison';
        compare.innerHTML =
            '<span class="usage-comparison-label">Yesterday:</span> ' + format_kwh(yest_total) + ' &nbsp;·&nbsp; ' +
            '<span class="usage-comparison-label">Same day last week:</span> ' + format_kwh(last_week_total);
        el.appendChild(compare);
    } else {
        const minutes = parse_int(week.data.today_runtime);
        const big = document.createElement('p');
        big.className = 'usage-today-value';
        big.textContent = format_minutes(minutes) + ' today';
        el.appendChild(big);

        const sub = document.createElement('p');
        sub.className = 'usage-today-sub';
        sub.textContent = '(runtime only — this firmware does not expose per-mode kWh)';
        el.appendChild(sub);
    }
}

function render_week(week) {
    const el = document.getElementById('usageWeek');
    if (!el) return;
    el.innerHTML = '';

    if (week.mode === 'ex') {
        // 14 values per field: [0..6] = this week (today + 6 days back),
        // [7..13] = same weekdays last week.
        const heat = parse_seq(week.data.week_heat).map(ten_to_kwh);
        const cool = parse_seq(week.data.week_cool).map(ten_to_kwh);
        if (heat.length < 7 && cool.length < 7) { render_not_supported('usageWeek'); return; }

        const totals = [];
        for (let i = 0; i < 14; i++) totals.push((cool[i] || 0) + (heat[i] || 0));
        const ticks = nice_ticks(Math.max(0.001, ...totals));
        const max   = ticks[ticks.length - 1];

        let this_week_sum = 0, last_week_sum = 0;
        for (let i = 0; i <  7; i++) this_week_sum += totals[i];
        for (let i = 7; i < 14; i++) last_week_sum += totals[i];

        const summary = document.createElement('p');
        summary.className = 'usage-week-summary';
        summary.innerHTML =
            '<span class="usage-comparison-label">This week:</span> ' + format_kwh(this_week_sum) + ' &nbsp;·&nbsp; ' +
            '<span class="usage-comparison-label">Last week:</span> ' + format_kwh(last_week_sum);
        el.appendChild(summary);

        el.appendChild(legend_cool_heat_two_weeks());

        // 7 day groups in chronological order: leftmost = today, rightmost = 6 days ago.
        const chart = make_chart('usage-chart-grouped', ticks, max, tick_format_kwh);
        const today = new Date();
        for (let pos = 0; pos < 7; pos++) {
            const days_ago      = pos;
            const this_week_idx = days_ago;
            const last_week_idx = days_ago + 7;
            const date = new Date(today);
            date.setDate(today.getDate() - days_ago);
            const label = (days_ago === 0) ? 'Today' : format_weekday(date);

            const group = document.createElement('div');
            group.className = 'usage-chart-group' + (days_ago === 0 ? ' is-today' : '');

            const track = document.createElement('div');
            track.className = 'usage-chart-group-track';

            const tw_total = (cool[this_week_idx] || 0) + (heat[this_week_idx] || 0);
            track.appendChild(build_thin_stacked_bar(
                cool[this_week_idx] || 0, heat[this_week_idx] || 0, max, '',
                label + ' (this week): ' + format_kwh(tw_total)
            ));
            const lw_total = (cool[last_week_idx] || 0) + (heat[last_week_idx] || 0);
            track.appendChild(build_thin_stacked_bar(
                cool[last_week_idx] || 0, heat[last_week_idx] || 0, max, 'last-year',
                'Same weekday last week: ' + format_kwh(lw_total)
            ));

            group.appendChild(track);
            group.appendChild(make_label(label));
            chart.bars.appendChild(group);
        }
        el.appendChild(chart.root);
    } else {
        const values = parse_seq(week.data.datas);
        if (values.length === 0) { render_not_supported('usageWeek'); return; }
        const ticks = nice_ticks(Math.max(1, ...values));
        const max   = ticks[ticks.length - 1];

        const chart = make_chart('usage-chart-week', ticks, max, tick_format_minutes);
        const today = new Date();
        values.forEach(function (mins, idx) {
            const days_ago = values.length - idx;
            const date = new Date(today);
            date.setDate(today.getDate() - days_ago);
            chart.bars.appendChild(build_runtime_bar(
                format_weekday(date), mins, max, format_minutes(mins)
            ));
        });
        el.appendChild(chart.root);
    }
}

function render_year(year) {
    const el = document.getElementById('usageYear');
    if (!el) return;
    el.innerHTML = '';

    if (year.mode === 'ex') {
        const ch = parse_seq(year.data.curr_year_heat).map(ten_to_kwh);
        const cc = parse_seq(year.data.curr_year_cool).map(ten_to_kwh);
        const ph = parse_seq(year.data.prev_year_heat).map(ten_to_kwh);
        const pc = parse_seq(year.data.prev_year_cool).map(ten_to_kwh);
        if (ch.length !== 12 && cc.length !== 12 && ph.length !== 12 && pc.length !== 12) {
            render_not_supported('usageYear');
            return;
        }
        const totals = [];
        for (let m = 0; m < 12; m++) {
            totals.push((cc[m] || 0) + (ch[m] || 0));
            totals.push((pc[m] || 0) + (ph[m] || 0));
        }
        const ticks = nice_ticks(Math.max(0.001, ...totals));
        const max   = ticks[ticks.length - 1];

        el.appendChild(legend_cool_heat_years());

        const chart = make_chart('usage-chart-grouped', ticks, max, tick_format_kwh);
        for (let m = 0; m < 12; m++) {
            const group = document.createElement('div');
            group.className = 'usage-chart-group';

            const track = document.createElement('div');
            track.className = 'usage-chart-group-track';

            track.appendChild(build_thin_stacked_bar(
                cc[m] || 0, ch[m] || 0, max, '',
                MONTH_NAMES[m] + ' this year: ' + format_kwh((cc[m] || 0) + (ch[m] || 0))
            ));
            track.appendChild(build_thin_stacked_bar(
                pc[m] || 0, ph[m] || 0, max, 'last-year',
                MONTH_NAMES[m] + ' last year: ' + format_kwh((pc[m] || 0) + (ph[m] || 0))
            ));

            group.appendChild(track);
            group.appendChild(make_label(MONTH_NAMES[m]));
            chart.bars.appendChild(group);
        }
        el.appendChild(chart.root);
    } else {
        const this_year = parse_seq(year.data.this_year);
        const prev_year = parse_seq(year.data.previous_year);
        if (this_year.length !== 12 && prev_year.length !== 12) {
            render_not_supported('usageYear');
            return;
        }
        const all = this_year.concat(prev_year);
        const ticks = nice_ticks(Math.max(1, ...all));
        const max   = ticks[ticks.length - 1];

        el.appendChild(legend_two_years());

        const chart = make_chart('usage-chart-grouped', ticks, max, tick_format_hours);
        for (let m = 0; m < 12; m++) {
            const group = document.createElement('div');
            group.className = 'usage-chart-group';

            const track = document.createElement('div');
            track.className = 'usage-chart-group-track';

            if (this_year[m] !== undefined) {
                track.appendChild(build_thin_runtime_bar(this_year[m], max, '',          MONTH_NAMES[m] + ' this year: ' + format_hours(this_year[m])));
            }
            if (prev_year[m] !== undefined) {
                track.appendChild(build_thin_runtime_bar(prev_year[m], max, 'last-year', MONTH_NAMES[m] + ' last year: ' + format_hours(prev_year[m])));
            }

            group.appendChild(track);
            group.appendChild(make_label(MONTH_NAMES[m]));
            chart.bars.appendChild(group);
        }
        el.appendChild(chart.root);
    }
}

function make_chart(extra_class, ticks, tick_max, tick_format) {
    const root = document.createElement('div');
    root.className = 'usage-chart ' + extra_class;
    root.appendChild(build_axis('left',  ticks, tick_max, tick_format));
    const bars = document.createElement('div');
    bars.className = 'usage-chart-bars';
    root.appendChild(bars);
    root.appendChild(build_axis('right', ticks, tick_max, tick_format));
    return { root: root, bars: bars };
}

function build_axis(side, ticks, tick_max, tick_format) {
    const axis = document.createElement('div');
    axis.className = 'usage-chart-axis usage-chart-axis-' + side;

    const track = document.createElement('div');
    track.className = 'usage-chart-axis-track';
    ticks.forEach(function (t, idx) {
        const tick = document.createElement('span');
        tick.className = 'usage-chart-axis-tick';
        tick.style.bottom = (t / tick_max * 100) + '%';
        tick.textContent = tick_format(t, idx === ticks.length - 1);
        track.appendChild(tick);
    });
    axis.appendChild(track);

    // Spacer below the track that matches the bar's label area, so the
    // axis track aligns vertically with the bars' tracks.
    const spacer = document.createElement('span');
    spacer.className = 'usage-chart-axis-spacer';
    spacer.innerHTML = '&nbsp;';
    axis.appendChild(spacer);

    return axis;
}

// Round a data max up to "nice" axis ticks: 0, 2, 4, 6, 8 rather than 0, 1.83, …
function nice_ticks(max) {
    if (!isFinite(max) || max <= 0) max = 0.1;
    const target_count = 5;
    const raw_interval = max / (target_count - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw_interval)));
    const normalized = raw_interval / magnitude;
    let nice;
    if      (normalized < 1.5) nice = 1;
    else if (normalized < 3)   nice = 2;
    else if (normalized < 7)   nice = 5;
    else                       nice = 10;
    const interval = nice * magnitude;
    const ticks = [];
    let v = 0;
    while (v <= max + interval * 0.001) {
        ticks.push(Math.round(v * 10000) / 10000);
        v += interval;
    }
    return ticks;
}

function tick_format_kwh(v, is_top) {
    const num = (v === Math.floor(v) || v >= 10) ? String(Math.round(v)) : v.toFixed(1);
    return num + (is_top ? ' kWh' : '');
}
function tick_format_minutes(v, is_top) { return String(Math.round(v)) + (is_top ? ' min' : ''); }
function tick_format_hours(v, is_top)   { return String(Math.round(v)) + (is_top ? ' h'   : ''); }

function make_label(text) {
    const lbl = document.createElement('span');
    lbl.className = 'usage-chart-label';
    lbl.textContent = text;
    return lbl;
}

function build_runtime_bar(label, value, max, value_text) {
    const bar = document.createElement('div');
    bar.className = 'usage-chart-bar';

    const track = document.createElement('div');
    track.className = 'usage-chart-track';

    const val = document.createElement('span');
    val.className = 'usage-chart-value';
    val.textContent = value_text;
    track.appendChild(val);

    const fill = document.createElement('div');
    fill.className = 'usage-chart-fill';
    fill.style.height = bar_pct(value, max) + '%';
    track.appendChild(fill);

    bar.appendChild(track);
    bar.appendChild(make_label(label));
    return bar;
}

function build_thin_runtime_bar(value, max, klass, title) {
    const wrapper = document.createElement('div');
    wrapper.className = 'usage-chart-bar-thin';
    wrapper.title = title;
    const fill = document.createElement('div');
    fill.className = 'usage-chart-fill' + (klass ? ' ' + klass : '');
    fill.style.height = bar_pct(value, max) + '%';
    wrapper.appendChild(fill);
    return wrapper;
}

function build_thin_stacked_bar(cool, heat, max, klass, title) {
    const wrapper = document.createElement('div');
    wrapper.className = 'usage-chart-bar-thin' + (klass ? ' ' + klass : '');
    wrapper.title = title;
    wrapper.appendChild(build_stack(cool, heat, max));
    return wrapper;
}

function build_stack(cool, heat, max) {
    const total = cool + heat;
    const stack = document.createElement('div');
    stack.className = 'usage-chart-stack';
    stack.style.height = bar_pct(total, max) + '%';

    if (heat > 0) {
        const h = document.createElement('div');
        h.className = 'usage-chart-segment usage-segment-heat';
        h.style.height = (heat / total) * 100 + '%';
        h.title = 'Heat: ' + format_kwh(heat);
        stack.appendChild(h);
    }
    if (cool > 0) {
        const c = document.createElement('div');
        c.className = 'usage-chart-segment usage-segment-cool';
        c.style.height = (cool / total) * 100 + '%';
        c.title = 'Cool: ' + format_kwh(cool);
        stack.appendChild(c);
    }
    return stack;
}

function legend_cool_heat_two_weeks() {
    const el = document.createElement('div');
    el.className = 'usage-legend';
    el.innerHTML =
        '<span class="usage-legend-item"><span class="usage-legend-swatch usage-segment-cool"></span> Cool</span>' +
        '<span class="usage-legend-item"><span class="usage-legend-swatch usage-segment-heat"></span> Heat</span>' +
        '<span class="usage-legend-note">left bar = this week, right bar = same weekday last week (faded)</span>';
    return el;
}

function legend_cool_heat_years() {
    const el = document.createElement('div');
    el.className = 'usage-legend';
    el.innerHTML =
        '<span class="usage-legend-item"><span class="usage-legend-swatch usage-segment-cool"></span> Cool</span>' +
        '<span class="usage-legend-item"><span class="usage-legend-swatch usage-segment-heat"></span> Heat</span>' +
        '<span class="usage-legend-note">left bar = this year, right bar = last year (faded)</span>';
    return el;
}

function legend_two_years() {
    const el = document.createElement('div');
    el.className = 'usage-legend';
    el.innerHTML =
        '<span class="usage-legend-item"><span class="usage-legend-swatch"></span> This year</span>' +
        '<span class="usage-legend-item"><span class="usage-legend-swatch last-year"></span> Last year</span>';
    return el;
}

function update_fetched_label(fetched_at) {
    const el = document.getElementById('usageFetchedLabel');
    if (!el) return;
    if (!fetched_at) { el.textContent = ''; return; }
    const d = new Date(fetched_at);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    el.textContent = 'fetched at ' + hh + ':' + mm;
}

function parse_int(v) {
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
}

function parse_seq(s) {
    if (s === undefined || s === null || s === '') return [];
    return String(s).split('/').map(parse_int);
}

function ten_to_kwh(v) { return (v || 0) / 10; }

function format_kwh(n)     { return n.toFixed(1) + ' kWh'; }
function format_hours(n)   { return n + ' h'; }

function format_minutes(n) {
    if (n < 60) return n + ' min';
    const h = Math.floor(n / 60);
    const m = n % 60;
    if (m === 0) return h + ' h';
    return h + ' h ' + m + ' min';
}

function bar_pct(value, max) {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
}

function format_weekday(date) {
    try {
        return date.toLocaleDateString(undefined, { weekday: 'short' });
    } catch (e) {
        return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
    }
}
