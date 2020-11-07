const OBSWebSocket = require('obs-websocket-js');
const fs = require("fs");

let rawConfig = fs.readFileSync("config.json");
let config = JSON.parse(rawConfig);

const open = require('open');
const path = require("path");
var express = require('express');
var session = require('express-session');
var passport= require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var request = require('request');
var handlebars = require('handlebars');

var app = express();
app.use(session({secret: config.sessionSecret, resave: false, saveUninitialized: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

const obs = new OBSWebSocket();


function startOAuthStrategy(config) {
	
	OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
	  var options = {
		url: 'https://api.twitch.tv/helix/users',
		method: 'GET',
		headers: {
		  'Client-ID': config.clientId,
		  'Accept': 'application/vnd.twitchtv.v5+json',
		  'Authorization': 'Bearer ' + accessToken
		}
	  };
	  request(options, function (error, response, body) {
		if (response && response.statusCode == 200) {
		  done(null, JSON.parse(body));
		} else {
		  done(JSON.parse(body));
		}
	  });
	}

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(user, done) {
		done(null, user);
	});


	passport.use('twitch', new OAuth2Strategy({
		authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
		tokenURL: 'https://id.twitch.tv/oauth2/token',
		clientID: config.clientId,
		clientSecret: config.clientSecret,
		callbackURL: config.callbackURL.replace("{port}",config.port),
		state: true
	  },
	  function(accessToken, refreshToken, profile, done) {
		profile.accessToken = accessToken;
		profile.clientId = config.clientId;
		profile.refreshToken = refreshToken;
		done(null, profile);
	  }
	));
}

if(config.clientId != "" && config.clientSecret != "") {
	startOAuthStrategy(config);
}

app.get('/auth/twitch', passport.authenticate('twitch', { scope: config.scopeAccess }));
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));

var helpHTML = handlebars.compile(`
<html><head><title>AdFK Help</title></head>
<body>
	<b>Config</b>
	<br>
	<table>
		<tr><th>accessToken</th><td>Filled in on OAuth</td></tr>
		<tr><th>refreshToken</th><td>Filled in on OAuth</td></tr>
		<tr><th>displayName</th><td>Filled in on OAuth</td></tr>
		<tr><th>broadcasterId</th><td>Filled in on OAuth</td></tr>
		<tr><th>clientId</th><td>Manually configured</td></tr>
		<tr><th>clientSecret</th><td>Manually configured</td></tr>
		<tr><th>sessionSecret</th><td>Default value set, feel free to ignore.</td></tr>
		<tr><th>callbackURL</th><td>Default value set. If you use a different callback when setting up the Twitch Application, change it here.</td></tr>
		<tr><th>scope</th><td>Default value set. Only allows access to run ads.</td></tr>
		<tr><th>delaySeconds</th><td>Number of seconds after switching to an Ad scene until the Ad is run. If no longer in an ad scene, does nothing.</td></tr>
		<tr><th>obsAddress</th><td>Default value set. Change if the address or port of OBS Websocket Plugin is different.</td></tr>
		<tr><th>obsPassword</th><td>If your websocket plugin has a password, set it here, otherwise leave empty.</td></tr>
		<tr><th>obsAdScenes</th><td>Enter the name of all OBS Scenes that you want to run an Ad in.</td></tr>
		<tr><th>availableAdLengths</th><td>The allowed Ad Break lengths on Twitch. Do not change. It is here for your reference.</td></tr>
		<tr><th>adLength</th><td>The length of the Ad you want to run.</td></tr>
		<tr><th>port</th><td>The port that AdFK runs on. Change if the default value is already in use on your system.</td></tr>
	</table>
	<br>
	<b>Note:</b> Do not ever share your config.json with anyone without removing the values for all tokens, ids and secrets.
	<br>
	<br>
	<br>
	<b>HTTP API</b>
	<br>
	<table>
		<tr><th><a href="http://localhost:{{port}}">http://localhost:{{port}}</a></th><td>Initial configuration and setting up OAuth here. Click the link to auto-configure your OAuth token whenever it expires or is reset.</td></tr>
		<tr><th>http://localhost:{{port}}/help</th><td>Help</td></tr>
		<tr><th><a href="http://localhost:{{port}}/config">http://localhost:{{port}}/config</a></th><td>Configure the application</td></tr>
		<tr><th>http://localhost:{{port}}/ad/:duration</th><td>[GET] Instantly run an ad with the specified duration (30, 60, 90, 120, 150, 180) after one second. Ex: /ad/30 </td></tr>
	</table>
	<br>
	<br>
	<br>
	<b>Setup</b>
	<br>
	<a href="https://dev.twitch.tv/console/apps/create">Register a Twitch Application</a> with the following settings:
		<table>
			<tr><th>Name</th><td>AdFK</td></tr>
			<tr><th>OAuth Redirect URLs</th><td>http://localhost:{{port}}/auth/twitch/callback</td></tr>
			<tr><th>Category</th><td>Application Integration (Or Other and explain this as OBS automation script idk)</td></tr>
		</table>
	<br>
	Then go and manage the application. <b>Copy the Client ID</b> and configure it in <b>config.json</b>.
	<br>
	Next, click on <b>New Secret</b> and confirm. Copy the generated secret into the <b>config.json. DO NOT SHARE THIS!</b>
	<br>
	<br>
	<b>Note:</b> OBS Must be running with the WebSocket plugin before running this application or it will crash!
<br>
<br>
<br>
<br>
<a href="/">Home</a>
</body>
</html>
`);

var successTemplate = handlebars.compile(`
<html><head><title>Twitch Auth Complete</title></head>
Successfully reconfigured OAuth! Enjoy!
<br>
<table>
    <tr><th>Display Name</th><td>{{display_name}}</td></tr>
</table>
<br>
<br>
<a href="/auth/twitch">Click to Re-Authorize</a>
<br>
<br>
<br>
<a href="/config">Configuration</a>
<br>
<br>
<br>
<a href="/help">Help & Documentation</a>
</html>`);

app.get("/help", function(req, res) {
	res.send(helpHTML(config));
});

app.get("/config", function(req, res) {
	if(Object.keys(req.query).length != 0){
		let runOAuthStrat = false;
		if (config['clientId'] == "" || config['clientSecret'] == "") {
			runOAuthStrat = true;
		}
		config["clientId"] = req.query.clientId;
		config["clientSecret"] = req.query.clientSecret;
		config["sessionSecret"] = req.query.sessionSecret;
		config["callbackURL"] = req.query.callbackURL;
		config["delaySeconds"] = parseInt(req.query.delaySeconds);
		config["obsAddress"] = req.query.obsAddress;
		config["obsPassword"] = req.query.obsPassword;
		config["obsAdScenes"] = req.query.obsAdScenes.split(",");
		config["port"] = parseInt(req.query.port);
		config["adLength"] = parseInt(req.query.adLength);
		fs.writeFile("./config.json", JSON.stringify(config, null, 4), err => {
			if (err) throw err;
		});
		if(runOAuthStrat) {
			startOAuthStrategy(config);
		}
		console.log("[APP] - Config updated. If port was changed, please restart AdFK");
		res.redirect("/config");
	}
	else {
		let tempConfig = JSON.parse(JSON.stringify(config));
		let obsScenesList = "";
		config['obsAdScenes'].forEach( (val, index, array) => {
			obsScenesList += val;
			if (index < array.length -1 ) {
				obsScenesList += ",";
			}
		});
		tempConfig["obsScenesList"] = obsScenesList;
		res.render("config", tempConfig);
	}
});

app.get('/', function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    res.send(successTemplate(req.session.passport.user.data[0]));
	if(config["accessToken"] == "" || config["accessToken"] != req.session.passport.user.accessToken) {	
		config["accessToken"] = req.session.passport.user.accessToken;
		config["refreshToken"] = req.session.passport.user.refreshToken;
		config["displayName"] = req.session.passport.user.data[0].display_name;
		config["broadcasterId"] = req.session.passport.user.data[0].id;
		fs.writeFile("./config.json", JSON.stringify(config, null, 4), err => {
			if (err) throw err;
		});
		console.log("[APP] - Successfully optained OAuth token from Twitch");
	}
  } else {
    res.send(`<html><head><title>Twitch Auth</title></head>
	<a href="/auth/twitch">Click to Authorize</a>
	<br>
	<br>
	<br>
	<a href="/config">Configuration</a>
	<br>
	<br>
	<br>
	<a href="/help">Help & Documentation</a>
	</html>`);
  }
});

obs.on('error', err => {
    console.error(err);
});
obs.on('ConnectionOpened', () => {
  console.log('[OBS] - Connected');

});

obs.on("SwitchScenes", data => {
	let length = config.adLength;
	if(config.obsAdScenes.includes(data.sceneName)) {
		// If we switch from an Ad scene to another, it will double trigger
		// but can't run two ads at same time, so it will fail to fail
		console.log("[OBS] - Scene Switched to an Ad scene");
		setTimeout( () => {
			obs.send("GetSceneList")
				.then(data2 => {
					if (config.obsAdScenes.includes(data2.currentScene)) {
						runAd(length);
					}
					else {
					}
				});						
		}, config.delaySeconds * 1000);
	}
	else {
		console.log("[OBS] - Switched to non-Ad scene")
	}
});

app.get("/ad/:duration", function (req, res) {

	if (req.params.duration == null) {
		res.send(null);
	}
	let length = parseInt(req.params.duration)
	
	if (!config.availableAdLengths.includes(length)) {
		res.send(null);
	}
	
	setTimeout( () => {runAd(length)}, 1000);
	res.send(null);
});

function appendLeadingZeroes(n){
  if(n <= 9){
    return "0" + n;
  }
  return n
}

function runAd(length) {
	console.log("[APP] - Attempting to run a "+length+"s ad");
	request.post({
		url:"https://api.twitch.tv/helix/channels/commercial", 
		headers:
			{
				"Authorization": "Bearer "+config["accessToken"],
				"Client-Id": config["clientId"],
				"Content-Type": "application/json"
			},
		body: 
			{
				"broadcaster_id": config["broadcasterId"],
				"length": length
			},
		json: true
		},
		(err, ress, body) => {
			if (body.hasOwnProperty("status") && body.status == 401 && body.message == "Invalid OAuth token") {
				if ( config.accessToken != "") {
					refreshToken(true, length);
				}
			}
			else if (body.status == 400) {
				console.log("[ERROR] - An ad has recently been run. Cannot run another");
			}
			else if(body.hasOwnProperty("data")) {
				console.log("[APP] - "+ body.data[0].message);
				
				let time = new Date();
				console.log("[APP] - " + appendLeadingZeroes(time.getHours()) + ":" 
					+ appendLeadingZeroes(time.getMinutes()) + ":" 
					+ appendLeadingZeroes(time.getSeconds()) + " - Ad Started");
				console.log("[APP] - New Ad can be played in " + body.data[0].retry_after + " seconds");
				
				setTimeout( () => {
					let newTime = new Date();
					console.log("[APP] - " + appendLeadingZeroes(time.getHours()) + ":" 
						+ appendLeadingZeroes(time.getMinutes()) + ":" 
						+ appendLeadingZeroes(time.getSeconds()) + " - Ad Ended");
				}, length * 1000);
				
				setTimeout( () => {
					console.log("[APP] - A new Ad can be played");
				}, body.data[0].retry_after * 1000);
			}
			else {
				console.log("[ERROR] - Could not run ad");
				console.log(body);
			}
		});
}

function refreshToken(attemptAdRun, length) {
	let url = "https://id.twitch.tv/oauth2/token";
    console.log("[APP] - Refreshing OAuth Token...");
	request.post({
		url: url,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		qs: {
			"grant_type": "refresh_token",
			"refresh_token": config.refreshToken,
		    "client_id": config.clientId,
			"client_secret": config.clientSecret,
			"scope": config.scopeAccess
    	}
		
	}, (err, res, body) => {
		body = JSON.parse(body);
		if(body.hasOwnProperty("status") && body.status == 400) {
			open("http://localhost:"+config.port);
		}
		else if (body.hasOwnProperty("access_token")) {
			config.accessToken = body.access_token;
			config.refreshToken = body.refresh_token;
			fs.writeFile("./config.json", JSON.stringify(config, null, 4), err => {
				if (err) throw err;
			});
			console.log("[APP] - OAuth token refreshed.");
			if(attemptAdRun) {
				runAd(length);
			}
		}
	});
}

app.listen(config.port, function () {
  console.log('[APP] - AdFK listening on http://localhost:'+config.port);
});

if (config.clientId == "" || config.clientSecret == ""){
	open("http://localhost:"+config.port+"/help");
}
else if (config.accessToken == "") {
	open("http://localhost:"+config.port);
}

let obsData = {address: config.obsAddress};
if (config.obsPassword != "") {
	obsData = {address: config.obsAddress, password: config.obsPassword};
}

obs.connect(obsData).catch(err => {console.log("[ERROR] - Unable to connect to OBS! Please start OBS then restart AdFK.")});