// Tab switcher for the nav-pills above the main content

const STORAGE_KEY = 'activeTab';
const DEFAULT_TAB = 'control';

let on_change_cb = null;

export function init_tabs(on_change) {
    on_change_cb = on_change || null;

    document.querySelectorAll('.tab-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
            set_tab(pill.dataset.tab);
        });
    });

    let restored = DEFAULT_TAB;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && document.querySelector('.tab-pill[data-tab="' + stored + '"]')) {
            restored = stored;
        }
    } catch (e) {}

    set_tab(restored);
}

export function set_tab(name) {
    document.querySelectorAll('.tab-pill').forEach(function (pill) {
        const is_active = pill.dataset.tab === name;
        pill.classList.toggle('active', is_active);
        pill.setAttribute('aria-selected', is_active ? 'true' : 'false');
    });

    document.querySelectorAll('.tab-pane').forEach(function (pane) {
        pane.classList.toggle('active', pane.dataset.tab === name);
    });

    try { localStorage.setItem(STORAGE_KEY, name); } catch (e) {}

    if (on_change_cb) on_change_cb(name);
}

export function current_tab() {
    const active = document.querySelector('.tab-pill.active');
    return active ? active.dataset.tab : DEFAULT_TAB;
}
