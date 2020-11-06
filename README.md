
# AdFK
 Automatically play Twitch Ads during specific scenes in OBS

## Setup

See the [Help](http://localhost:7482/help) page to view more detailed information.
### Configuration
Configure the config.json in order to use the application.

Modifying the config.json can be done two ways. The first is by going to the [configuration page](http://localhost:7482/config) as the fields you do should not edit are disabled.
The second way is to manually configure the json file.

#### Required Configuration

You are required to register a twitch application for this app.
This can be done as follows: 
	- [Register](https://dev.twitch.tv/console/apps/create) a new Twitch Application with the name **AdFK**
	- OAuth redirect url: **http://localhost:7482/auth/twitch/callback**
	- Category: Application Integration (Or Other, describe that this tool is for automating ads with OBS)
	- Go to **Manage Application** and copy the Client Id into the config.json.
	- **Generate** a new Client Secret and copy it into the config.json. DO NOT SHARE THIS.

For the rest of the config, some fields will be automatically populated and can be ignored. The following fields **must** be set if empty, or **can** be changed by you:
- clientId
- clientSecret
- delaySeconds (full integers only)
	- The number of seconds after switching to an Ad scene until an Ad tries to play.
- obsAddress (default is the default OBS websocket address)
- obsPassword (optional)
- obsAdScenes
	- A list of scene names for **each** scene you **want ads to run** on.
	- In the confis.json, this is a list of string. In the UI configuration, it is a **comma** separated list.
- adLength
	- The length of the ad to run. **Must** be either 30, 60, 90, 120, 150 or 180
- port
	- Keep at default unless conflicting with another program. If so, change in callback URLs too)

The remaining configuration is either meant to be readonly or auto-configured when the program creates an OAuth token from Twitch.


Note: For the initial startup, configuring clientId and clientSecret will require a restart if configured via the json file. The UI will change it live.


## Requirements
OBS must be running before launching the program. If it isn't, then an error message will be displayed. Simple start OBS and restart AdFK to resolve.

OBS must also have the WebSocket plugin.

## Build
Install Dependencies
`npm install`

Run/Test locally
`npm start`

Build executable*
`npm build`
Executable will be AdFK.exe, and requires config.json and the views folder (and contents).