export const config = {
    refreshInterval: 2000, //What time interval should there be between refreshing the information from the AC unit (in milliseconds)
    enableTimer: true, //Feature flag for the ON/OFF timer feature. Set to false to hide the timer button, disable the /timer.php endpoint, and stop the cron worker from firing pending timers.
    showSpinner: false, //Show a small spinner in the top-right corner while the page is talking to the AC. Off by default
    units: [
        /* This units are representations for the AC units within the home.
           The IP represents the IP of the AC unit which must be reachable from the PHP WebServer
           The name of the AC unit is display in the navigation bar. It can be adapted to your own liking
           The icon is the class representation of font awesome so you can adapt the icons for the AC unit
           If you have only one AC unit please change only the first unit IP and if you have two change only the first two units
           The UI will adapt accordingly for the number of AC units
         */
        {ip: "unit1IP", name: "unit1Name", icon: "fa-1"},
        {ip: "unit2IP", name: "unit2Name", icon: "fa-2"},
        {ip: "unit3IP", name: "unit3Name", icon: "fa-3"}
    ]
};

// Default to true if the flag is missing
export function is_timer_enabled() {
    return config.enableTimer !== false;
}

// Default to false if the flag is missing
export function is_spinner_enabled() {
    return config.showSpinner === true;
}