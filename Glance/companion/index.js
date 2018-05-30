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
var airQualityURL = null;
var USGSRiverURL = null;
//WeatheyAPI connection
var API_KEY = null;
var ENDPOINT = null;

// Fetch the weather from OpenWeather
function queryWUnderground() {
  let weatherURL = getWeatherEndPoint();
  console.log(weatherURL);
  return fetch(weatherURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(data);
       var weather = {
          temperature: data["current_observation"]["temp_f"],
          humidity: data["current_observation"]["relative_humidity"],
          weatherDesc: data["current_observation"]["weather"],
          windgust: data["current_observation"]["wind_gust_mph"],
          windspeed: data["current_observation"]["wind_mph"],
          winddir: data["current_observation"]["wind_dir"],
          dewpoint: data["current_observation"]["dewpoint_f"],
          uv: data["current_observation"]["solarradiation"],
          raintoday: data["current_observation"]["precip_today_in"],
          wxTime: data["current_observation"]["observation_epoch"]
        }
        // Send the weather data to the device
        console.log(JSON.stringify(data));
        return weather;
      });
  })
  .catch(function (err) {
    //console.log(getWeatherEndPoint() + "&APPID=" + getWeatherApiKey());
    console.log(getWeatherEndPoint());
    console.log("Error getting weather" + err);
  });
}

function queryAirNow() {
  let airQualityURL = getAirNowEndPoint();
  console.log(airQualityURL);
  return fetch(airQualityURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(JSON.stringify(data));
       var airQuality = {
         O3: data[0]["AQI"],
         PM2_5: data[1]["AQI"]
        }
        // Send the air quality data to the device
        return airQuality;
      });
  })
  .catch(function (err) {
    console.log(getAirNowEndPoint());
    console.log("Error getting air quality" + err);
  });
}

function queryUSGSRiver() {
  let USGSRiverURL = getUSGSRiverEndPoint();
  console.log(USGSRiverURL);
  return fetch(USGSRiverURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(JSON.stringify(data));
       var riverGuage = {
         stage: data["value"]["timeSeries"][0]["values"][0]["value"][0]["value"]
        }
        // Send the river guage data to the device
        return riverGuage;
      });
  })
  .catch(function (err) {
    console.log(getUSGSRiverEndPoint());
    console.log("Error getting river guage" + err);
  });
}

function queryIOB() {
  let iobURL = "http://127.0.0.1:17580/pebble";
  console.log(iobURL);
  return fetch(iobURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(JSON.stringify(data));
       var iob = {
         iob: data["bgs"][0]["iob"]
        }
        // Send the iob data to the device
        return iob;
      });
  })
  .catch(function (err) {
    console.log("Error getting iob" + err);
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
       resolve( queryWUnderground() );
     });
  
     let airQualityPromise = new Promise(function(resolve, reject) {
       resolve( queryAirNow() );
     });
  
     let riverGuagePromise = new Promise(function(resolve, reject) {
       resolve( queryUSGSRiver() );
     });  
  
     let IOBPromise = new Promise(function(resolve, reject) {
       resolve( queryIOB() );
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
      
    Promise.all([weatherPromise, BGDPromise, airQualityPromise, riverGuagePromise, IOBPromise]).then(function(values) {
      let dataToSend = {
        'weather':values[0],
        'BGD':values[1],
        'airQuality' : values[2],
        'riverGuage' : values[3],
        'iob' : values[4],
        'settings': {
          'bgColor': getSettings('bgColor'),
          'highThreshold': highThreshold,
          'lowThreshold': lowThreshold,
          'timeFormat' : getSettings('timeFormat'),
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
    return  "http://127.0.0.1:17580/sgv.json?count=24"
  }
}

function getWeatherEndPoint() {
  if (getSettings('StationID').name && getSettings('wuAPI').name){
    return "https://api.wunderground.com/api/" + getSettings('wuAPI').name + "/conditions/q/pws:" + getSettings('StationID').name + ".json";
  }
}

function getAirNowEndPoint() {
  if (getSettings('anAPI').name && getSettings('anZip').name){
    return "https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=" + getSettings('anZip').name + "&distance=10&API_KEY=" + getSettings('anAPI').name;
    /*return "http://docs.airnowapi.org/QueryTool/ajax/executeWebServiceUrl?serviceId=ObservationAQ&url=http%3A%2F%2Fwww.airnowapi.org%2Faq%2Fobservation%2FzipCode%2Fcurrent%2F%3Fformat%3Dapplication%2Fjson%26zipCode%3D" + getSettings('anZip').name + "%26distance%3D10%26API_KEY%3D" + getSettings('anAPI').name;*/
  }
}

function getUSGSRiverEndPoint() {
  if (getSettings('guageID')){
    return "https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00065&sites=" + getSettings('guageID').name;
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
