let request_is_control_loading = false;
let request_is_sensor_loading = false;
let timer; //in milliseconds

let last_control_response;
let control_timeout;
let last_sensor_response;
let sensor_timeout;
const degreesSymbol = '\xB0'; // °


// These variables are used for dynamically injection of the config.js information
// noinspection JSUnusedGlobalSymbols
let unit1IP;
let unit1Name;
// noinspection JSUnusedGlobalSymbols
let unit2IP;
// noinspection JSUnusedGlobalSymbols
let unit2Name;
// noinspection JSUnusedGlobalSymbols
let unit3IP;
// noinspection JSUnusedGlobalSymbols
let unit3Name;

let activeUnitId = 1;


//---------SET UP FUNCTIONS------------
// Setup from the config.js properties
timer = config.refreshInterval;
init_unit(config.units[0], 1);
// if there is only one unit do not display the selection for the units
if (!hasConfigForUnit(2)) {
    document.getElementById("unit-row").style = "display: none;";
} else {
    init_unit(config.units[1], 2);
    // if there are only two unis do not display the third option
    if (!hasConfigForUnit(3)) {
        document.getElementById("3").style = "display: none;";
    } else {
        init_unit(config.units[2], 3);
    }
}

function init_unit(unit, unitId) {
    window["unit" + unitId + "IP"] = unit.ip;
    window["unit" + unitId + "Name"] = unit.name;
    document.getElementById(unitId)["name"] = unit.name;
    document.getElementById(unitId + "Icon").className += unit.icon;
}

function hasConfigForUnit(unitId) {
    var configUnit = config.units[unitId-1];
    return !!configUnit && configUnit.ip !== "unit" + unitId + "IP";
}

function default_select_first_unit() {
    document.getElementById("activeUnitName").textContent = unit1Name;
    document.getElementById("1").className = "btn btn-info unit-btn";
}
default_select_first_unit();


function request_control() {
    const ip = getActiveUnit_IP();
    const target = "./api.php";
    const request = "GET";
    const parameters = "uri=/aircon/get_control_info&unit_ip=" + ip;
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        //state 4 of a request means DONE
        if (xmlhttp.readyState === 4) {
            request_is_control_loading = false;
            if ((!request_is_control_loading) && (!request_is_sensor_loading)) {
                set_loading(true);
            }
            if (xmlhttp.status === 200) {
                set_alert(false, "");
                const json_response = JSON.parse(xmlhttp.responseText);
                last_control_response = json_response;
                control_response_handler(json_response);
                control_timeout = setTimeout(request_control, timer);
            } else {
                const error_string = `Control ajax request to ${ip} failed`;
                console.error(`Error: ${error_string}`);
                set_alert(true, error_string);
            }
        }
    };
    xmlhttp.open(request, target + "?" + parameters, true);
    xmlhttp.send();
    request_is_control_loading = true;
    sleep(3000);
    set_loading(false);
}

function send_control(opts) {
    const ip = getActiveUnit_IP();
    const target = "./api.php";
    const request = "POST";
    const parameters = "unit_ip=" + ip;
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        //state 4 of a request means DONE
        if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
                set_alert(false, "");
                const response = JSON.parse(xmlhttp.responseText);
                console.debug(response);
            } else {
                const error_string = `Send control request to ${ip} failed`;
                console.error(`Error: ${error_string}`);
                set_alert(true, error_string);
            }
        }
    };

    xmlhttp.open(request, target + "?" + parameters, true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.send(JSON.stringify(opts));
}

function request_sensor() {
    const ip = getActiveUnit_IP();
    const target = "./api.php";
    const request = "GET";
    const parameters = "uri=/aircon/get_sensor_info&unit_ip=" + ip;
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        //state 4 of a request means DONE
        if (xmlhttp.readyState === 4) {
            request_is_control_loading = false;
            if ((!request_is_sensor_loading) && (!request_is_sensor_loading)) {
                set_loading(true);
            }
            if (xmlhttp.status === 200) {
                set_alert(false, "");
                const json_response = JSON.parse(xmlhttp.responseText);
                last_sensor_response = json_response;
                sensor_response_handler(json_response);
                sensor_timeout = setTimeout(request_sensor, timer);
            } else {
                const error_string = `Send ajax request to ${ip} failed`;
                console.error(`Error: ${error_string}`);
                set_alert(true, error_string);
            }
        }
    };
    xmlhttp.open(request, target + "?" + parameters, true);
    xmlhttp.send();
    request_is_sensor_loading = true;
    sleep(3000);
    set_loading(false);
}

function control_response_handler(json_response) {
    reset_wing();
    reset_fan();
    reset_mode();

    const target_temp = parseFloat(json_response.stemp).toFixed(1);

    if (json_response.mode === "0" || json_response.mode === "1") {
        if (target_temp <= 18) {
            set_target_temp_arrow(true, true);
            set_target_temp_arrow(false, false);
        } else if (target_temp >= 31) {
            set_target_temp_arrow(true, false);
            set_target_temp_arrow(false, true);
        } else {
            set_target_temp_arrow(true, true);
            set_target_temp_arrow(false, true);
        }
    } else if (json_response.mode === "3") {
        if (target_temp <= 18) {
            set_target_temp_arrow(true, true);
            set_target_temp_arrow(false, false);
        } else if (target_temp >= 33) {
            set_target_temp_arrow(true, false);
            set_target_temp_arrow(false, true);
        } else {
            set_target_temp_arrow(true, true);
            set_target_temp_arrow(false, true);
        }
    } else if (json_response.mode === "4") {
        if (target_temp <= 10) {
            set_target_temp_arrow(true, true);
            set_target_temp_arrow(false, false);
        } else if (target_temp >= 31) {
            set_target_temp_arrow(true, false);
            set_target_temp_arrow(false, true);
        } else {
            set_target_temp_arrow(true, true);
            set_target_temp_arrow(false, true);
        }
    } else {
        set_target_temp_arrow(true, true);
        set_target_temp_arrow(false, true);
    }

    set_target_temp(target_temp);
    set_power(Boolean(parseInt(json_response.pow)));
    set_mode(parseInt(json_response.mode));
    let f_mode = json_response.f_rate;
    if (f_mode === "A") {
        f_mode = 1;
    } else if (f_mode === "B") {
        f_mode = 2;
    } else {
        f_mode = parseInt(f_mode);
    }
    set_fan(f_mode);
    set_wing(parseInt(json_response.f_dir));
}

function sensor_response_handler(json_response) {
    set_home_temp(parseInt(json_response.htemp));
    set_outside_temp(parseInt(json_response.otemp));
}

function minimize_opt(opt) {
    let min_opt = {};
    for (const x in opt) {
        if (x === "unit" ||
            x === "pow" ||
            x === "mode" ||
            x === "stemp" ||
            x === "shum" ||
            x === "f_rate" ||
            x === "f_dir"
        ) {
            min_opt[x] = opt[x];
        }
    }
    return min_opt;
}


//----------ON CLICK FUNCTIONS------------

function mode_onclick(str_mode) {
    if (!last_control_response) return;
    let options = minimize_opt(last_control_response);
    options["unit"] = last_control_response["dfu" + str_mode];
    options["mode"] = str_mode;
    options["f_rate"] = last_control_response["dfr" + str_mode];
    options["f_dir"] = last_control_response["dfd" + str_mode];
    options["shum"] = "0";
    if (str_mode === "6") {
        options["stemp"] = "0";
    } else {
        options["stemp"] = last_control_response["dt" + str_mode];
    }
    send_control(options);
    update();
}

function unit_onclick(str_unit_select) {
    let options = minimize_opt(last_control_response);
    set_unit(str_unit_select);
    request_control();
    resetTemp_onclick()
}

function power_onclick() {
    if (!last_control_response) return;
    const options = minimize_opt(last_control_response);
    options.pow = ((options.pow === "0") ? 1 : 0);
    send_control(options);
    update();
}

function fan_onclick(num_fan_level) {
    if (!last_control_response) return;
    const options = minimize_opt(last_control_response);
    options.f_rate = num_fan_level;
    send_control(options);
    update();
}

function wing_onclick(num_wing_mode) {
    if (!last_control_response) return;
    const options = minimize_opt(last_control_response);
    if (num_wing_mode === last_control_response.f_dir) {
        options.f_dir = 0;
    } else {
        options.f_dir = num_wing_mode;
    }
    send_control(options);
    update();
}

function temp_onclick(float_increase_value) {
    if (!last_control_response) return;
    const options = minimize_opt(last_control_response);
    options.stemp = (parseFloat(last_control_response.stemp) + float_increase_value).toString();
    send_control(options);
    update();
}


//---------GUI SET FUNCTIONS------------

function set_unit(str_unitId) {
    activeUnitId = str_unitId;
    switch (str_unitId) {
        case "1":
            document.getElementById("1").className = "btn btn-info unit-btn";
            document.getElementById("2").className = "btn btn-default unit-btn";
            document.getElementById("3").className = "btn btn-default unit-btn";
            break;
        case "2":
            document.getElementById("2").className = "btn btn-info unit-btn";
            document.getElementById("3").className = "btn btn-default unit-btn";
            document.getElementById("1").className = "btn btn-default unit-btn";
            break;
        case "3":
            document.getElementById("3").className = "btn btn-info unit-btn";
            document.getElementById("1").className = "btn btn-default unit-btn";
            document.getElementById("2").className = "btn btn-default unit-btn";
            break;
    }
    document.getElementById("activeUnitName").textContent = window["unit" + str_unitId + "Name"];
}

function set_power(bool_is_on) {
    const power = document.getElementById("power");
    const powerIcn = document.getElementById("powerIcn");
    const powerBtn = document.getElementById("powerBtn");

    power.textContent = bool_is_on ? " ON" : " OFF";

    if (bool_is_on) {
        powerBtn.classList.remove("btn-default");
        powerBtn.classList.add("btn-info");
        powerIcn.style.fontSize = "1.6em";
        powerIcn.style.color = "green";
    } else {
        powerBtn.classList.remove("btn-info");
        powerBtn.classList.add("btn-default");
        powerIcn.style.fontSize = "1.6em";
        powerIcn.style.color = "red";
    }
}

function resetTemp_onclick() {
    request_is_sensor_loading = false;
    update();
}

function reset_mode() {
    var mode_list = document.getElementsByClassName("mode-btn btn-info");
    for (var i = 0; i < mode_list.length; ++i) {
        mode_list[i].className = "btn btn-default mode-btn";
    }
}

/**
 * Sets the active mode button based on the given numeric mode
 *
 * Allowed mode values and their meaning:
 * - 0: Auto
 * - 1, 7: Normalize to Auto
 * - 2: Dehumidify
 * - 3: Cooling
 * - 4: Heating
 * - 6: Fan
 *
 * The function highlights the selected mode button
 *
 * @param {number} num_mode - The numeric mode identifier.
 */
function set_mode(num_mode) {
    // Normalize mode: 1 and 7 map to auto (0)
    if (num_mode === 1 || num_mode === 7) num_mode = 0;

    const map_num_to_mode = {
        0: "mode_auto",
        2: "mode_dehum",
        3: "mode_cooling",
        4: "mode_heating",
        6: "mode_fan"
    };

    // Highlight the corresponding mode button
    const element_id = map_num_to_mode[num_mode];
    if (element_id) {
        const button_element = document.getElementById(element_id);
        button_element.className = "btn btn-info mode-btn";
    } else {
        console.warn(`set_mode() switch: default case reached. num_mode was ${num_mode}`);
    }
}


function set_home_temp(num_temp) {
    document.getElementById("home_temp").textContent = " " + num_temp + degreesSymbol + "C";
}

function set_outside_temp(num_temp) {
    document.getElementById("outside_temp").textContent = " " + num_temp + degreesSymbol + "C";
}

function set_target_temp(num_temp) {
    if (isNaN(num_temp)) {
        show_target_temp(false);
        document.getElementById("target_temp").textContent = " ~ ";
    } else {
        document.getElementById("target_temp").textContent = " " + num_temp + degreesSymbol + "C";
        show_target_temp(true);
    }
}

function show_target_temp(bool_show_temp) {
    var tt_col = document.getElementById("target_temp_col");

    if (bool_show_temp) {
        tt_col.classList.remove("sr-only");
    } else {
        tt_col.classList.add("sr-only");
    }
}

/**
 * Enables or disables the target temperature arrow.
 *
 * @param {boolean} bool_is_arrow_up - If true, targets the "up" arrow, else targets the "down" arrow.
 * @param {boolean} bool_is_enabled - If true, enables the arrow, else it disables it.
 */
function set_target_temp_arrow(bool_is_arrow_up, bool_is_enabled) {
    const arrow_id = bool_is_arrow_up ? "target_temp_up" : "target_temp_down";
    const arrow_element = document.getElementById(arrow_id);

    if (bool_is_enabled) {
        arrow_element.classList.remove("disabled");
    } else {
        arrow_element.classList.add("disabled");
    }
}

function set_fan(num_fan_mode) {
    switch (num_fan_mode) {
        case 1:
            document.getElementById("fan_auto").className = "btn btn-info fan-btn";
            break;
        case 2:
            document.getElementById("fan_eco").className = "btn btn-info fan-btn";
            break;
        case 3:
            set_fan_level_img(1);
            break;
        case 4:
            set_fan_level_img(2);
            break;
        case 5:
            set_fan_level_img(3);
            break;
        case 6:
            set_fan_level_img(4);
            break;
        case 7:
            set_fan_level_img(5);
            break;
        default:
            console.warn(`set_fan() switch: default case reached. num_fan_mode was ${num_fan_mode}`);
    }
}

function set_fan_level_img(num_fan_level) {
    var fan;
    for (var i = 1; i < 6; ++i) {
        fan = document.getElementById("fan_lvl_" + i.toString());
        if (i <= num_fan_level) {
            fan.src = "media/level_" + i.toString() + "_on.svg";
        } else {
            fan.src = "media/level_" + i.toString() + "_off.svg";
        }
    }
}

function reset_fan() {
    var fan_list = document.getElementsByClassName("fan-btn");
    for (var i = 0; i < fan_list.length; ++i) {
        fan_list[i].classList.remove("btn-info");
        fan_list[i].classList.add("btn-default");
    }
    set_fan_level_img(0);
}

function reset_wing() {
    var wing_list = document.getElementsByClassName("wing-btn");
    for (var i = 0; i < wing_list.length; ++i) {
        wing_list[i].classList.remove("btn-info");
        wing_list[i].classList.add("btn-default");
    }
}

function set_wing(num_wing_mode) {
    let elem = null;
    switch (num_wing_mode) {
        case 0:
            elem = document.getElementById("wing_s");
            elem.classList.remove("btn-default");
            elem.classList.add("btn-info");
            break;
        case 1:
            elem = document.getElementById("wing_v");
            elem.classList.remove("btn-default");
            elem.classList.add("btn-info");
            break;
        case 2:
            elem = document.getElementById("wing_h");
            elem.classList.remove("btn-default");
            elem.classList.add("btn-info");
            break;
        case 3:
            elem = document.getElementById("wing_b");
            elem.classList.remove("btn-default");
            elem.classList.add("btn-info");
            break;
        default:
            console.warn(`set_wing() switch: default case reached. num_wing_mode was ${num_wing_mode}`);
    }
}

function sleep(num_ms) {
    return new Promise(resolve => setTimeout(resolve, num_ms));
}

function set_loading(bool_is_loading) {
    var spinner = document.getElementById("spinner");
    if (bool_is_loading) {
        spinner.classList.remove("sr-only");
        spinner.className = "navbar-text navbar-right";
        sleep(3000);
    } else {
        spinner.className = "navbar-text navbar-right sr-only";
        spinner.classList.add("sr-only");
    }
}

function set_alert(bool_has_alert, str_message) {
    let alert_element = document.getElementById("alert");
    if (bool_has_alert) {
        alert_element.classList.remove("sr-only");
        alert_element.className = "alert alert-danger";
        alert_element.lastElementChild.innerHTML = `<b>Error:</b> ${str_message}`;
    } else {
        alert_element.className = "alert alert-danger sr-only";
        alert_element.classList.add("sr-only");
    }
}

function getActiveUnit_IP() {
    return window["unit" + activeUnitId + "IP"];
}

function update() {
    clearTimeout(control_timeout);
    clearTimeout(sensor_timeout);
    if (!request_is_control_loading)
        request_control();
    if (!request_is_sensor_loading)
        request_sensor();
}

update();
