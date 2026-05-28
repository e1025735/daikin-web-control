// Daikin control-info enum values

export const MODE = Object.freeze({
    AUTO: '1',     // device also reports 0 or 7 for auto; we send '1'
    DEHUM: '2',
    COOL: '3',
    HEAT: '4',
    FAN: '6',
});

// Values the device may return that should be highlighted as "auto".
export const MODE_AUTO_VALUES = Object.freeze(['0', '1', '7']);

// Display id used by set_mode() when highlighting the active mode button.
export const MODE_BUTTON_ID = Object.freeze({
    '0': 'mode_auto',
    '1': 'mode_auto',
    '7': 'mode_auto',
    '2': 'mode_dehum',
    '3': 'mode_cooling',
    '4': 'mode_heating',
    '6': 'mode_fan',
});

export const F_RATE = Object.freeze({
    AUTO: 'A',
    SILENCE: 'B',
    LVL_1: '3',
    LVL_2: '4',
    LVL_3: '5',
    LVL_4: '6',
    LVL_5: '7',
});

export const F_DIR = Object.freeze({
    STOPPED: '0',
    VERTICAL: '1',
    HORIZONTAL: '2',
    BOTH: '3',
});

// Target-temperature limits per mode (low/high).
export const STEMP_RANGE = Object.freeze({
    [MODE.AUTO]:  { min: 18, max: 31 },
    [MODE.COOL]:  { min: 18, max: 33 },
    [MODE.HEAT]:  { min: 10, max: 31 },
    [MODE.DEHUM]: { min: null, max: null },  // not adjustable
    [MODE.FAN]:   { min: null, max: null },  // not adjustable
});

export const DEGREES = '\xB0';  // °
