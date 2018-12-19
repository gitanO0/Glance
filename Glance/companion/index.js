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
function queryWeather(data1) {
  if (data1.pullWeather === undefined || data1.pullWeather == true) {
     let weatherURL = getWeatherEndPoint();
     console.log(weatherURL);
     return fetch(weatherURL)
     .then(function (response) {
       return response.json()
        .then(function(data) {
         console.log(data);
         
         var weather = {
            temperature: data["currently"]["temperature"],
            humidity: data["currently"]["humidity"],
            weatherDesc: data["currently"]["summary"],
            windgust: data["currently"]["windGust"],
            windspeed: data["currently"]["windSpeed"],
            winddir: data["currently"]["windBearing"],
            dewpoint: data["currently"]["dewPoint"],
            uv: data["currently"]["uvIndex"],
            raintoday: data["currently"]["precipProbability"],
            wxTime: data["currently"]["time"]
          }
          // Send the weather data to the device
          console.log(JSON.stringify(data));
          return weather;
        });
    })
    .catch(function (err) {
      //console.log(getWeatherEndPoint() + "&APPID=" + getWeatherApiKey());
      //console.log(getWeatherEndPoint());
      console.log("Error getting weather" + err);
    });
  }
  else {
    var weather = {};
  }
}

function querySecondWeather(data1) {
  if (data1.pullWeather === undefined || data1.pullWeather == true) {
    let secondWeatherURL = getSecondWeatherEndPoint();
    console.log('Clear to pull secondary weather:  ' + data1.pullWeather)
    console.log(secondWeatherURL);
    return fetch(secondWeatherURL)
    .then(function (response) {
       return response.json()
        .then(function(data) {
         console.log(data);
         var weather = {
            temperature: data["currently"]["temperature"],
            weatherDesc: data["currently"]["summary"],
            windgust: data["currently"]["windGust"],
            windspeed: data["currently"]["windSpeed"],
            raintoday: data["currently"]["precipProbability"]
          }
          // Send the weather data to the device
          console.log(JSON.stringify(data));
          return weather;
        });
    })
    .catch(function (err) {
      //console.log(getWeatherEndPoint() + "&APPID=" + getWeatherApiKey());
      //console.log(getWeatherEndPoint());
      console.log("Error getting weather" + err);
    });
  }
}

function queryAirNow(data1) {
  if (data1.pullWeather === undefined || data1.pullWeather == true) {
    let airQualityURL = getAirNowEndPoint();
    console.log(airQualityURL);
    return fetch(airQualityURL)
    .then(function (response) {
       return response.json()
        .then(function(data) {
         console.log(JSON.stringify(data));
         if (data[0] && data[1] && data[2]) {
          var airQuality = {
             O3: data[0]["AQI"],
             PM2_5: data[1]["AQI"],
             PM10: data[2]["AQI"]
           }      
         } else if (data[0] && data[1]) {
             if (data[0]["ParameterName"] == "O3" && data[1]["ParameterName"] == "PM2.5") {
               var airQuality = {
                 O3: data[0]["AQI"],
                 PM2_5: data[1]["AQI"]
               }       
             } else if (data[0]["ParameterName"] == "O3" && data[1]["ParameterName"] == "PM10") {
                 var airQuality = {
                   O3: data[0]["AQI"],
                   PM10: data[1]["AQI"]        
                 }
               } else if (data[0]["ParameterName"] == "PM2.5" && data[1]["ParameterName"] == "PM10") {
                   var airQuality = {
                     PM2_5: data[0]["AQI"],
                     PM10: data[1]["AQI"]        
                   }         
               }   
         } else if (data[0]) {
             if (data[0]["ParameterName"] == "O3") {
               var airQuality = {
                 O3: data[0]["AQI"]      
               }       
             } else if (data[0]["ParameterName"] == "PM2.5") {
                 var airQuality = {
                   PM2_5: data[0]["AQI"]      
                 }          
             } else if (data[0]["ParameterName"] == "PM10") {
                 var airQuality = {
                   PM10: data[0]["AQI"]      
                 }          
             }
         }
          // Send the air quality data to the device
          return airQuality;
        });
    })
    .catch(function (err) {
      //console.log(getAirNowEndPoint());
      console.log("Error getting air quality" + err);
    });  
  }
}

function queryUSGSRiver() {
  let USGSRiverURL = getUSGSRiverEndPoint();
  console.log(USGSRiverURL);
  return fetch(USGSRiverURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(JSON.stringify(data));
       var riverGauge = {
         stage: data["value"]["timeSeries"][0]["values"][0]["value"][0]["value"]
        }
        // Send the river gauge data to the device
        return riverGauge;
      });
  })
  .catch(function (err) {
    //console.log(getUSGSRiverEndPoint());
    console.log("Error getting river gauge" + err);
  });
}

function queryWaterTemp() {
  let waterTempURL = getWaterTempEndPoint();
  console.log(waterTempURL);
  return fetch(waterTempURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(JSON.stringify(data));
       var waterTemp = {
         airTemp: data["features"][0]["attributes"]["tmdb_f"],
         waterTemp: data["features"][0]["attributes"]["sst1_f"]
        }
        // Send the water/air temp data to the device
        return waterTemp;
      });
  })
  .catch(function (err) {
    //console.log(getSdWaterTempEndPoint());
    console.log("Error getting water_air temp" + err);
  });
}

function queryFcRain(data1) {
  if (data1.pullWeather === undefined || data1.pullWeather == true) {
    let fcRainURL = getFcRainEndPoint();
    console.log(fcRainURL);
    return fetch(fcRainURL)
    .then(function (response) {
       return response.json()
        .then(function(data) {
         console.log(JSON.stringify(data));
         var fcRain = {
           hr24Rain: data["features"][0]["attributes"]["SWTR.VW_RAIN_DATA.HR24"]
          }
          // Send the rain data to the device
          return fcRain;
        });
    })
    .catch(function (err) {
      console.log("Error getting rain data" + err);
    });  
  }
}

function queryIOB() {
  let iobURL = getNightScoutEndPoint();
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

function queryEldoraSnow() {
  let eldoraSnowURL = getEldoraSnowEndPoint();
  console.log(eldoraSnowURL);
  return fetch(eldoraSnowURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(JSON.stringify(data));
       var iob = {
         eldoraSnow: data["snowReport"][0]["items"][1]['amount']
        }
        // Send the iob data to the device
        return iob;
      });
  })
  .catch(function (err) {
    console.log("Error getting iob" + err);
  });
}

function sendSensorDataToXdrip(data) {
  let sendSensorsURL = "http://127.0.0.1:17580/sgv.json?heart=" + data.heart + "&steps=" + data.steps;
  console.log(sendSensorsURL);
  return fetch(sendSensorsURL)
  .then(function (response) {
     return response.json()
      .then(function(data) {
       console.log(JSON.stringify(data));
       // this query sends heart and steps data to the phone to be shown in xdrip+.  
       //There is no meaningful return value back to this device.
      });
  })
  .catch(function (err) {
    console.log("Error sending heart and steps data" + err);
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
           if (bg.sgv === undefined) {
             bg.sgv = 0;
           }
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

function formatReturnData(data) {
     let weatherPromise = new Promise(function(resolve, reject) {
       resolve( queryWeather(data) );
     });  
  
     let secondWeatherPromise = new Promise(function(resolve, reject) {
       resolve( querySecondWeather(data) );
     });
  
     let airQualityPromise = new Promise(function(resolve, reject) {
       resolve( queryAirNow(data) );
     });
  
     let fcRainPromise = new Promise(function(resolve, reject) {
       resolve( queryFcRain(data) );
     });
  
     let eldoraSnowPromise = new Promise(function(resolve, reject) {
       resolve( queryEldoraSnow(data) );
     });
  
     //let riverGaugePromise = new Promise(function(resolve, reject) {
     //  resolve( queryUSGSRiver() );
     //}); 
  
     //let WaterTempPromise = new Promise(function(resolve, reject) {
     //  resolve( queryWaterTemp() );
     //}); 
  
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
    
    // riverGaugePromise   ... removed for now.  issues... using the sandiego water temp stuff in its place
    // 'riverGauge' : values[3],
    //, WaterTempPromise    'waterAirInfo' : values[5],
    Promise.all([weatherPromise, secondWeatherPromise, fcRainPromise, BGDPromise, airQualityPromise, IOBPromise, eldoraSnowPromise]).then(function(values) {
      let dataToSend = {
        'weather':values[0],
        'secondWeather':values[1],
        'fcRain':values[2],
        'BGD':values[3],
        'airQuality' : values[4],
        'iob' : values[5],
        'eldoraSnow' : values[6],
        'settings': {
          'bgColor': getSettings('bgColor'),
          'highThreshold': highThreshold,
          'lowThreshold': lowThreshold,
          'timeFormat' : getSettings('timeFormat')
        }
      }
      //console.log(JSON.stringify(dataToSend));
      returnData(dataToSend)
    });
  }


// Listen for messages from the device
messaging.peerSocket.onmessage = function(evt) {
  if (evt.data) {
    formatReturnData(evt.data);
    
    console.log(JSON.stringify(evt.data));
    sendSensorDataToXdrip(evt.data);
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
  if(getSettings('endpoint').name && getSettings('endpoint').name != '') {
    return getSettings('endpoint').name+"?count=24&brief_mode=Y"
  } else {
    // Default xDrip web service 
    return  "http://127.0.0.1:17580/sgv.json?count=24&brief_mode=Y"
  }
}

function getWeatherEndPoint() {
  if (getSettings('location').name && getSettings('weatherAPIkey').name && getSettings('location').name != '' && getSettings('weatherAPIkey').name != ''){
    return "https://api.darksky.net/forecast/"+ getSettings('weatherAPIkey').name + "/" + getSettings('location').name + "?exclude=minutely,hourly,daily,flags";
  }
}

function getSecondWeatherEndPoint() {
  if (getSettings('secondLocation').name && getSettings('weatherAPIkey').name && getSettings('secondLocation').name != '' && getSettings('weatherAPIkey').name != ''){
    return "https://api.darksky.net/forecast/"+ getSettings('weatherAPIkey').name + "/" + getSettings('secondLocation').name + "?exclude=minutely,hourly,daily,flags";
  }
}

function getAirNowEndPoint() {
  if (getSettings('anAPI').name && getSettings('anZip').name && getSettings('anAPI').name != '' && getSettings('anZip').name != ''){
    return "https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=" + getSettings('anZip').name + "&distance=10&API_KEY=" + getSettings('anAPI').name;
  }
}

function getUSGSRiverEndPoint() {
  if (getSettings('gaugeID'.name)){
    return "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=" + getSettings('gaugeID').name + "&parameterCd=00065&siteStatus=active";
  }
}

function getWaterTempEndPoint() {
  if (getSettings('WaterTempStationID') && getSettings('WaterTempStationID') != ''){
    return "https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/obs_meteocean_insitu_sfc_time/MapServer/2/query?where=locid%3D%27" + getSettings('WaterTempStationID').name.toUpperCase() + "%27+AND+projmins%3D0&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=sst1_f%2Ctmdb_f%2Cstarttime&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentsOnly=false&datumTransformation=&parameterValues=&rangeValues=&f=pjson";
  }
}

function getFcRainEndPoint() {
  return "https://gisweb.fcgov.com/arcgis/rest/services/RainWarning/MapServer/3/query?f=json&returnGeometry=false&spatialRel=esriSpatialRelIntersects&geometry=%7B%22xmin%22%3A-11698218.002451649%2C%22ymin%22%3A4949872.5875253985%2C%22xmax%22%3A-11697988.691366794%2C%22ymax%22%3A4950101.898610254%2C%22spatialReference%22%3A%7B%22wkid%22%3A102100%2C%22latestWkid%22%3A3857%7D%7D&geometryType=esriGeometryEnvelope&inSR=102100&outFields=SWTR.VW_RAIN_DATA.HR24&outSR=102100";
}

function getEldoraSnowEndPoint() {
  return "https://www.eldora.com/api/v1/dor/conditions";
}

function getNightScoutEndPoint() {
  return getSettings('NightscoutSiteURL');
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
