// Theme switcher: stores choice in localStorage, applies data-theme to <html> and
// reacts to OS preference changes while in "auto" mode

const VALID_MODES = ['auto', 'light', 'dark'];

function get_stored_theme() {
    try { return localStorage.getItem('theme') || 'auto'; }
    catch (e) { return 'auto'; }
}

function resolve_theme(mode) {
    if (mode === 'auto') {
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    return mode;
}

function highlight_theme_button(mode) {
    const target_id = 'theme' + mode.charAt(0).toUpperCase() + mode.slice(1);
    ['themeAuto', 'themeLight', 'themeDark'].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === target_id) {
            el.classList.remove('btn-light');
            el.classList.add('btn-info');
        } else {
            el.classList.remove('btn-info');
            el.classList.add('btn-light');
        }
    });
}

export function set_theme(mode) {
    if (!VALID_MODES.includes(mode)) return;
    try { localStorage.setItem('theme', mode); } catch (e) {}
    document.documentElement.setAttribute('data-theme', resolve_theme(mode));
    highlight_theme_button(mode);
}

export function init_theme() {
    highlight_theme_button(get_stored_theme());

    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = function () {
        if (get_stored_theme() === 'auto') {
            document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
        }
    };
    if (mq.addEventListener) mq.addEventListener('change', listener);
    else if (mq.addListener) mq.addListener(listener);
}
