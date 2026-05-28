// Renders the unit selection buttons from config.units and tracks which
// unit is currently active.

import { config } from '../config.js';
import { state } from './state.js';

export function hasConfigForUnit(unit_id) {
    const cu = config.units[unit_id - 1];
    return !!cu && cu.ip !== 'unit' + unit_id + 'IP';
}

export function init_units(on_change) {
    const row = document.getElementById('unit-row');
    const group = document.getElementById('unit-buttons');

    const configured = [];
    config.units.forEach(function (unit, idx) {
        const unit_id = idx + 1;
        if (!hasConfigForUnit(unit_id)) return;
        state.vars['unit' + unit_id + 'IP']   = unit.ip;
        state.vars['unit' + unit_id + 'Name'] = unit.name;
        configured.push({ unit_id, unit });
    });

    if (configured.length === 0) {
        row.style.display = 'none';
        return;
    }

    if (configured.length === 1) {
        row.style.display = 'none';
        state.active_unit_id = configured[0].unit_id;
        document.getElementById('activeUnitName').textContent =
            state.vars['unit' + state.active_unit_id + 'Name'];
        return;
    }

    group.innerHTML = '';
    configured.forEach(function ({ unit_id, unit }) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-light unit-btn';
        btn.id = 'unit-' + unit_id;
        btn.dataset.unitId = String(unit_id);
        btn.innerHTML = '<i class="fa-solid fa-2x ' + unit.icon + '"></i>';
        btn.addEventListener('click', function () {
            if (state.active_unit_id === unit_id) return;
            set_unit(unit_id);
            on_change(unit_id);
        });
        group.appendChild(btn);
    });

    set_unit(configured[0].unit_id);
}

export function set_unit(unit_id) {
    state.active_unit_id = unit_id;

    document.querySelectorAll('.unit-btn').forEach(function (btn) {
        const is_active = parseInt(btn.dataset.unitId, 10) === unit_id;
        btn.classList.toggle('btn-info',  is_active);
        btn.classList.toggle('btn-light', !is_active);
    });

    const name_el = document.getElementById('activeUnitName');
    if (name_el) name_el.textContent = state.vars['unit' + unit_id + 'Name'] || '';
}
