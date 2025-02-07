Daikin-Control
==============

![Web Gui Preview](https://github.com/bmoesdijk/daikin-control/blob/master/web_gui-new.png)

The '''Daikin Emura FTXG-L''' air conditioner comes with a wifi module preinstalled that allows you to control it via internet. Other Daikin airconditioners can be upgraded with a wifi module WDA00001.
The solution provided by Daikin is a mobile app (very well designed) that allows you to control the air conditioner(s) even remotely, exploiting the REST API of the wifi module.

Even though this system works well, there are some problems:

- It is not possible to control the AC from a web browser. You must use the official mobile application. If your device is not supported or you are working from a computer you cannot control your air conditioner via your PC.
- To control your AC remotely from outside your lan, your requests must go through the Daikin server. The device response is slow because the system is based on polling request. (you can't set the ip of the AC on the mobile application)
- When you have multiple units that you want to control the official app is very slow.

<br>
To configure your unit in the web UI:<br>
Open the file: config.js<br>
Adapt the units params for the IP address(es), names and icons of your unit(s). Here is an example for two units:<br>

	const config = {
        refreshInterval: 2000,
        units: [
            {ip: "192.168.1.10", name: "Living room", icon: "fa-couch"},
            {ip: "192.168.1.11", name: "Bed room", icon: "fa-bed"},
            {ip: "unit3IP", name: "unit3Name", icon: "fa-3"}
        ]
    };

When you have a single unit, only configure the IP address of the first unit. Leave the IP addresses of the other 2 units to the default ("unit2IP" and "unit3IP") since this will prevent the selection buttons on the top of the screen to appear.

![Web Gui Preview](https://github.com/bmoesdijk/daikin-control/blob/master/web_gui-phone.PNG)

If you also want the web UI to be used as an app on your iPhone, do the following:<br>
Make sure that the file  apple-touch-icon.png is pressent in the media directory. (i.e.in web/daikin-control-UI-updated/media/apple-touch-icon.png)<br>
Open the webUI from Safari on your iPhone <br>
From the menu options select "add to home screen" <br>
An icon should appear with the Daikin logo contained in apple-touch-icon.png on your home screen <br>
Now you can open the web UI as an app from your iPhone <br>

This project aims to provide 2 main things:

- **unoffcial documentation** of Daikin API needed to control the air conditioner
- **web interface** to manage air conditioner settings


## Tested Hardware

The API described by this document have been tested and seems to be working with firmware version from `1.4.3` to `3.3.1`.

The following hardware configurations have been used for testing:

```
ModelName:          Daikin Perfera FTXM20M
ModelID:                FTXM20M2JV1B
WifiControllerID:    BRP069B41 3P472899-1
Software version:   2.5.1
```
```
ModelName:          Daikin Emura FTXG-L
ModelID:                FTXG35LV1BW
WifiControllerID:    BRP069A41 4P358711-2C
Software version:   1.4.3
```
```
ModelName:          Daikin Emura FVXS-F
ModelID:            FVXS35FV1B
WifiControllerID:   BRP069A42
Software version:   2.6.0
```

If you try new hardware configurations or new firmware versions, please contact me.


## API System

Daikin original API use REST.

You can use GET http request to retrive informations and POST http request to apply new settings.

Uri                | GET | POST | desc
-------------------|-----|------|-----
/common/basic_info | X   |      | Provides Daikin account information (security issue!), software version, mac address and generic info
/common/get_remote_method | X | | Provides information about polling system
/common/set_remote_method | | X | Set information on the polling system (reduce remote time update ??)
/aircon/get_model_info | X | | Provides model informarion
/aircon/get_control_info | X | | Main Uri to request all current status parameters
/aircon/set_control_info | X | X | Main Uri to set status parameters (control almost all)
/aircon/get_sensor_info | X | | Provides information on sensors (temperatures, humidity, power consumption)
/aircon/get_timer  | X | | ?
/aircon/set_timer  | | X | ?
/aircon/get_price  | X | | ?
/aircon/set_price  | | X | ?
/aircon/get_target | X | | ?
/aircon/set_target | | X | ?
/aircon/get_week_power| X | | Provides weekly and today runtime information (in mn)
/aircon/get_year_power| X | | Provides yearly runtime information
/aircon/get_program | X | | ?
/aircon/set_program | | X | ?
/aircon/get_scdltimer | X | | Provides information about on/off weekly timer
/aircon/set_scdltimer | | X | Set information about on/off weekly timer
/common/get_notify  | X | | ?
/common/set_notify  | | X | ?
/common/set_regioncode | | X | ?
/common/set_led | | X | ?
/common/reboot | X |  | reboot the AP

## Parameters

### `/aircon/set_control_info`

#### Power
param name :  **pow**

description: represents the power state of the device

value | desc
:----:|-----
  0   | OFF
  1   | ON

#### Mode
param name :  **mode**

description: represents the operating mode

value | desc
:----:|-----
  2   | DEHUMDIFICATOR
  3   | COLD
  4   | HOT
  6   | FAN
  0-1-7   | AUTO

#### Temp
param name : **stemp**

description: represents the target temperature

general accepted range 10-41

mode  | accepted range
:----:|---------------
AUTO  | 18-31
HOT   | 10-31
COLD  | 18-33


device memorize last target temp state for each mode under dft* (dft1,dft2...) parameters. You can't set directly these.

#### Fan rate
param name : **f_rate**

description: represents the fan rate mode

Daikin Emura FVXS does not support silence (=B) value for fan rate mode functionality.

value | desc
:----:|-----
A     | auto
B     | silence
3     | lvl_1
4     | lvl_2
5     | lvl_3
6     | lvl_4
7     | lvl_5

device memorize last fan rate state for each mode under dfr* (dfr1,dfr2...) parameters. You can't set directly these.

#### Fan direction
param name : **f_dir**

description: represents the fan direction

value | desc
:----:|-----
0     | all wings stopped
1     | vertical wings motion
2     | horizontal wings motion
3     | vertical and horizontal wings motion

device memorize last fan rate state for each mode under dfd* (dfd1,dfd2...) parameters. You can't set directly these.

#### Humidity
param name : **shum**

description: represents the target humidity

Daikin Emura FTXG-L and FVXS does not support humidity related functionality.

device memorize last humidity state for each mode under dh* (dh1,dh2...) parameters. You can't set directly these.

------------------------------
### Minimal parameters set

The `/aircon/set_control_info` has some mandatory parameters, it means that you need to include them in all the requests to this endpoint even if you are not interested in changing those specific values.

These are the mandatory parameters:
- `pow`
- `mode`
- `stemp`
- `shum`
- `f_rate`
- `f_dir`

While these are the ones that can be omitted:
- `adv`
- `dt*`
- `dh*`
- `dfr*`
- `dfd*`
- `b_mode`
- `b_stemp`
- `b_shum`
- `b_f_rate`
- `b_f_dir`
- `alert`

minimal request example: `pow=1&mode=1&stemp=26&shum=0&f_rate=B&f_dir=3`

### `/common/set_led`
#### Led
It seems that this settings doesn't actually change led.

param name: **led**

value | desc
:----:|-----
  -	| set to '0' (same as '0' value)
  0   | ?
  1   | ?


## Unsupported settings
This list show which hardware functionality are not supported by API

- led brightness switch


## Libraries
- [daikin-aricon-pylib](https://github.com/ael-code/daikin-aricon-pylib): Python library for managing Daikin air conditioners
- [jdaikin](https://bitbucket.org/JonathanGiles/jdaikin): Java-based API to interact with Daikin units


## Useful resource
- http://daikinsmartdbt.jp/ the site has been shut down but you can still have a look at the [cached page](https://github.com/ael-code/daikin-control/blob/readme_plus/daikinsmartdbt.htm)


## Control Info Examples

Switched Off
```
ret=OK,pow=0,mode=7,adv=,stemp=24.0,shum=0,dt1=24.0,dt2=M,dt3=25.0,dt4=25.0,dt5=25.0,dt7=24.0,dh1=0,dh2=50,dh3=0,dh4=0,dh5=0,dh7=0,dhh=50,b_mode=7,b_stemp=24.0,b_shum=0,alert=255,f_rate=4,f_dir=0,b_f_rate=4,b_f_dir=0,dfr1=4,dfr2=5,dfr3=7,dfr4=5,dfr5=5,dfr6=5,dfr7=4,dfrh=5,dfd1=0,dfd2=0,dfd3=3,dfd4=0,dfd5=0,dfd6=0,dfd7=0,dfdh=0
```
Auto 25C ( CONFORT AIR ) ( INTELLIGENT EYE )
```
ret=OK,pow=1,mode=7,adv=,stemp=25.0,shum=0,dt1=25.0,dt2=M,dt3=22.0,dt4=25.0,dt5=25.0,dt7=25.0,dh1=0,dh2=50,dh3=0,dh4=0,dh5=0,dh7=0,dhh=50,b_mode=7,b_stemp=25.0,b_shum=0,alert=255,f_rate=A,f_dir=0,b_f_rate=4,b_f_dir=0,dfr1=4,dfr2=5,dfr3=4,dfr4=5,dfr5=5,dfr6=5,dfr7=4,dfrh=5,dfd1=0,dfd2=0,dfd3=0,dfd4=0,dfd5=0,dfd6=0,dfd7=0,dfdh=0
```
```
ret=OK,pow=1&dh2=50&dfd4=0&b_stemp=25.0&alert=255&f_dir=0&b_shum=0&dh4=0&dfd3=0&dh3=0&dfd2=0&dfr2=5&dfr7=B&dfr4=5&dfd7=0&dfrh=5&dt3=25.0&dfdh=0&adv=&dh5=0&dh1=0&dfr6=5&dt5=25.0&dfr1=B&stemp=25.0&shum=0&dfd6=0&f_rate=A&b_f_dir=0&dt1=25.0&dhh=50&dfd1=0&dfr3=5&dh7=0&mode=1&dfd5=0&b_mode=7&dt4=25.0&b_f_rate=A&dt7=25.0&dt2=M&dfr5=5
```
Hot 25c ( AIR silence )
```
ret=OK,pow=1,mode=4,adv=,stemp=25.0,shum=0,dt1=25.0,dt2=M,dt3=22.0,dt4=25.0,dt5=25.0,dt7=25.0,dh1=0,dh2=50,dh3=0,dh4=0,dh5=0,dh7=0,dhh=50,b_mode=4,b_stemp=25.0,b_shum=0,alert=255,f_rate=B,f_dir=0,b_f_rate=B,b_f_dir=0,dfr1=B,dfr2=B,dfr3=B,dfr4=B,dfr5=B,dfr6=B,dfr7=B,dfrh=5,dfd1=0,dfd2=0,dfd3=0,dfd4=0,dfd5=0,dfd6=0,dfd7=0,dfdh=0
```

## Honorable Mentions
* Boudewijn van de Moesdijk
* Erik Hjortberg
* ael-code
