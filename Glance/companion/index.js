// Import the messaging module
import * as messaging from "messaging";
import { encode } from 'cbor';
import { outbox } from "file-transfer";
import { settingsStorage } from "settings";
import { me } from "companion";
import { geolocation } from "geolocation";


// // default URL pointing at xDrip Plus endpoint
var URL = null;
var weatherURL = null;
//WeatheyAPI connection
var API_KEY = null;
var ENDPOINT = null


// Fetch the weather from OpenWeather
function queryOpenWeather() {
  let weatherURL = getWeatherEndPoint();
  console.log(weatherURL);
  return fetch(weatherURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(data);
       var weather = {
          temperature: Math.round(data["current_observation"]["temp_f"]),
          humidity: data["current_observation"]["relative_humidity"],
          weatherDesc: data["current_observation"]["weather"],
          windgust: data["current_observation"]["wind_gust_mph"],
          windspeed: data["current_observation"]["wind_mph"],
          winddir: data["current_observation"]["wind_degrees"],
          dewpoint: data["current_observation"]["dewpoint_f"],
          uv: data["current_observation"]["UV"],
          wxTime: data["current_observation"]["observation_epoch"]
        }
        // Send the weather data to the device
        console.log(data["current_observation"]["observation_epoch"]);
        return weather;
      });
  })
  .catch(function (err) {
    //console.log(getWeatherEndPoint() + "&APPID=" + getWeatherApiKey());
    console.log(getWeatherEndPoint());
    console.log("Error getting weather" + err);
  });
}


function queryBGD() {
  let url = getSgvURL()
  console.log(url)
  return fetch(url)
  .then(function (response) {
      return response.json()
      .then(function(data) {
        let date = new Date();
       
        let currentBgDate = new Date(data[0].dateString);
        let diffMs =date.getTime() - JSON.stringify(data[0].date) // milliseconds between now & today              
        if(isNaN(diffMs)) {
           console.log('Not a number set to 5 mins')
           diffMs = 300000
        } else {
          // If the time sense last pull is larger then 15mins send false to display error
          if(diffMs > 900000) {
            diffMs = false
          }else {
             if(diffMs > 300000) {
              diffMs = 300000
            } else {
              diffMs = Math.round(300000 - diffMs) + 60000 // add 1 min to account for delay in communications 
            }

          }
        }
        
        let bloodSugars = []
        
        // if there is no delta calc it 
        let delta = 0;
        let count = data.length - 1;
        if(!data[count].delta) {
          delta = data[count].sgv - data[count - 1].sgv 
        }
        
        data.forEach(function(bg, index){
           bloodSugars.push({
             sgv: bg.sgv,
             delta: ((Math.round(bg.delta)) ? Math.round(bg.delta) : delta),
             nextPull: diffMs,
             units_hint: ((bg.units_hint) ? bg.units_hint : 'mgdl')

          })
        })   
        // Send the data to the device
        return bloodSugars.reverse();
      });
  })
  .catch(function (err) {
    console.log("Error fetching bloodSugars: " + err);
  });
}


// Send the weather data to the device
function returnData(data) {  
  const myFileInfo = encode(data);
  outbox.enqueue('file.txt', myFileInfo)
   
}

function formatReturnData() {
     let weatherPromise = new Promise(function(resolve, reject) {
      resolve( queryOpenWeather() );
    });
    
    let BGDPromise = new Promise(function(resolve, reject) {
      resolve( queryBGD() );
    });
    let highThreshold = null
    let lowThreshold = null
    
    if(getSettings("highThreshold")){
      highThreshold = getSettings("highThreshold").name
    } else {
      highThreshold = 165
    }
  
    if(getSettings("lowThreshold")){
     lowThreshold = getSettings("lowThreshold").name
    } else {
     lowThreshold = 70
    }
      
    Promise.all([weatherPromise, BGDPromise]).then(function(values) {
      let dataToSend = {
        'weather':values[0],
        'BGD':values[1],
        'settings': {
          'bgColor': getSettings('bgColor'),
          'highThreshold': highThreshold,
          'lowThreshold': lowThreshold,
          'timeFormat' : getSettings('timeFormat')
        }
      }
      returnData(dataToSend)
    });
  }


// Listen for messages from the device
messaging.peerSocket.onmessage = function(evt) {
  if (evt.data) {
    formatReturnData()
  }
}




// Listen for the onerror event
messaging.peerSocket.onerror = function(err) {
  // Handle any errors
  console.log("Connection error: " + err.code + " - " + err.message);
}


//----------------------------------------------------------
//
// This section deals with settings
//
//----------------------------------------------------------
settingsStorage.onchange = function(evt) {
 console.log( getSettings(evt.key) )
    formatReturnData()
}

// getters 
function getSettings(key) {
  if(settingsStorage.getItem( key )) {
    return JSON.parse(settingsStorage.getItem( key ));
  } else {
    return undefined
  }
}

function getSgvURL() {
  if(getSettings('endpoint').name) {
    return getSettings('endpoint').name+"?count=24"
  } else {
    // Default xDrip web service 
    return  "http://127.0.0.1:17580/sgv.json"
  }
}

function getWeatherEndPoint() {
  if (getSettings('StationID').name && getSettings('wuAPI').name){
    return "https://api.wunderground.com/api/" + getSettings('wuAPI').name + "/conditions/q/pws:" + getSettings('StationID').name + ".json";
  }
}

function getTempType() {
   if(getSettings('tempType')){
     return 'metric'
   } else {
      return 'imperial'
   }
}

// TODO make this work Lat and Lon auto detect based on location. 
function locationSuccess(position) {
  return "lat=" + position.coords.latitude + "&lon=" + position.coords.longitude;
}

function locationError(error) {
  console.log("Error: " + error.code,
              "Message: " + error.message);
}
