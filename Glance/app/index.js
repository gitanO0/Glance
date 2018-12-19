import * as messaging from "messaging";
import document from "document";
import { charger, battery } from "power";
import { HeartRateSensor } from "heart-rate";
import { today } from "user-activity";
import { inbox } from "file-transfer";
import fs from "fs";
import * as fs from "fs";
import { vibration } from "haptics";
import clock from "clock";

import Graph from "./graph.js";

let prevTemp = 999;
let prevHum = 999;
let prevDP = 999;
let prevUV = 999;

let heartRate = new HeartRateSensor();
let totalSeconds = 0;
let timeFormat = false;

let high = document.getElementById("high");
let middle = document.getElementById("middle");
let low = document.getElementById("low");

let docGraph = document.getElementById("docGraph");
let myGraph = new Graph(docGraph);

let showAlertModal = true;

let numPulls = 0;

let prevWeatherPullTime = null;
let lastFullChargeDateTime = null;
let clearForWeatherDataPull = false;

let timeOut;
// Init 
setTime(); 
setDate();
setBattery();
startMonitors();

// The updater is used to update the screen every 5 SECONDS 
function updater() {
  //setBattery();
  startMonitors();
  addSecond();
  
  // process prev weather pull time now incase the companion connection is broken, we still want to see this time diff
  if (prevWeatherPullTime != null) {
    var lastUpdatedTime = processPrevWeatherPullDifTime(prevWeatherPullTime);
    setTimeUI(lastUpdatedTime);
  }
}
setInterval(updater, (5 * 1000));  //5 secs
setInterval(fetchCompaionData, ((60 * 1000) * 5));  // 5 min

// The fiveMinUpdater is used to update the screen every 5 MINUTES 
//function fiveMinUpdater() {
  //fetchCompaionData();
  //if (document.getElementById("companionStatusCircle").style.fill == "#00ff00") {
      
  //}
  //if (fileName) {
  //  fs.unlinkSync('file.txt');
  //}
//}

function setTime() {
  clock.granularity = "seconds";
  clock.ontick = function(evt) {
    document.getElementById("hours").text = (monoDigits("0" + evt.date.getHours()).slice(-2));
    document.getElementById("minutes").text = (monoDigits("0" + evt.date.getMinutes()).slice(-2));
    document.getElementById("seconds").text = (monoDigits("0" + evt.date.getSeconds()).slice(-2));   
    
    if ((evt.date.getSeconds() % 2) == 0) {
      document.getElementById("colon1").style.visibility = "visible";
      document.getElementById("colon2").style.visibility = "visible";
    } else {
      document.getElementById("colon1").style.visibility = "hidden";
      document.getElementById("colon2").style.visibility = "hidden";
    }
  };
}

function setDate() { 
  let dateObj = new Date();
  let month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
  let date = ('0' + dateObj.getDate()).slice(-2);
  let year = dateObj.getFullYear().toString().substr(-2);
  let shortDate = month + '/' + date  + '/' + year;
  document.getElementById("date").text = shortDate;
  
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  document.getElementById("day").text = days[dateObj.getDay()];
}

function setBattery() {
  if (battery.chargeLevel < 30){
     document.getElementById("battery").style.fill = "#ff9980"
  } else if (battery.chargeLevel >= 80) {
     document.getElementById("battery").style.fill = "#4dff4d"
  } else {
    document.getElementById("battery").style.fill = "#b3b3b3"
  }
  document.getElementById("battery").text = (Math.round(battery.chargeLevel) + "%");
  //document.getElementById("battery-level").width =  (.3 * Math.floor(battery.chargeLevel))
  
  if (battery.chargeLevel > 99) {
    lastFullChargeDateTime = (new Date().getTime()); //in milliseconds
    
    let json_data = {
      "lastChargeTime": lastFullChargeDateTime
    };
    fs.writeFileSync("lct.cbor", json_data, "cbor");
  }
    
  var curDateTime = (new Date().getTime());
  var daysSinceLastFullCharge = null;

  
  //var timeFileExists = false;
  //var json_object = null;
  //const listDir = fs.listDirSync("private/data");
  //while((dirIter = listDir.next()) && !dirIter.done) {
  //  if (dirIter.value == "lct.cbor") {
  //    timeFileExists = true;
  //    json_object = fs.readFileSync("lct.cbor", "cbor");
  //  }
  //}
  
  var json_object = null;
  json_object = fs.readFileSync("lct.cbor", "cbor");
  
  if (lastFullChargeDateTime) {
    daysSinceLastFullCharge = (((((curDateTime - lastFullChargeDateTime) / 1000) / 60) / 60) / 24).toFixed(1);
  }
  else if (json_object) {
    daysSinceLastFullCharge = (((((curDateTime - json_object.lastChargeTime) / 1000) / 60) / 60) / 24).toFixed(1);    
  }
  else {
    daysSinceLastFullCharge = "na";
  }
  document.getElementById("chargeDays").text = daysSinceLastFullCharge;
}

function startMonitors() {  
  heartRate.start();
  let data = {
      heartRate: heartRate.heartRate ? heartRate.heartRate : 0
  };
  
   /*let stepCount = (today.local.steps || 0)+"";

   stepCount = (stepCount * .001);
   stepCount = (Math.round(stepCount * 10) / 10);
   stepCount += "k";
  
   document.getElementById("heart").text = JSON.stringify(data.heartRate);
   document.getElementById("step").text = stepCount;*/
  
   let floorCount = today.local.elevationGain;
   document.getElementById("floors").text = floorCount + "f";
   document.getElementById("floors").style.fontWeight = "regular";
   //if (floorCount > 9) {
   //  document.getElementById("floors").style.fontWeight = "bold";
   //}
  
  let distance = (today.local.distance || 0)+"";
  distance = (distance * 0.000621371);
  distance = (Math.round(distance * 100) / 100).toFixed(2);
  //distance += "m";
  
  document.getElementById("heart").text = JSON.stringify(data.heartRate);
  document.getElementById("step").text = distance;
}

//minutes since last pull 
function addSecond() {
  totalSeconds += 5;
  // document.getElementById("seconds").text = pad(totalSeconds % 60);
  document.getElementById("bgMinutes").text = parseInt(totalSeconds / 60) + ' mins';
}

// converts a mg/dL to mmoL
function mmol( bg ) {
    let mmolBG = Math.round( (0.0555 * bg) * 10 ) / 10;
  return mmolBG;
}

// converts mmoL to  mg/dL 
function  mgdl( bg ) {
    let mgdlBG = Math.round( (bg * 18) / 10 ) * 10;
  return mgdlBG;
}


// set the image of the status image 
function setStatusImage(status) {
    document.getElementById("status-image").href = "img/" + status
}
//----------------------------------------------------------
//
// This section deals with getting data from the compaion app 
//
//----------------------------------------------------------
// Request data from the companion
function fetchCompaionData(cmd) {
  setStatusImage('refresh.png')
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    document.getElementById("companionStatusCircle").style.fill = "#00ff00";
    // Send a command to the companion
    
    if (prevWeatherPullTime == null || processPrevWeatherPullDifTime(prevWeatherPullTime) > 14) {
        clearForWeatherDataPull = true;
    }
    else {
        clearForWeatherDataPull = false;
    }
    
    console.log("Next weather data pull set to: " + clearForWeatherDataPull);
    
    messaging.peerSocket.send({
      command: cmd,
      heart: heartRate.heartRate,
      steps: today.local.steps,
      pullWeather: clearForWeatherDataPull
    });
  } else {
    document.getElementById("companionStatusCircle").style.fill = "#FF8C00";
  }
}

// Listen for the onerror event
messaging.peerSocket.onerror = function(err) {
  // Handle any errors
  console.log("Connection error: " + err.code + " - " + err.message);
  document.getElementById("companionStatusCircle").style.fill = "#cc0000";
}

function processPrevWeatherPullDifTime(time) {
  if (time) {
    var wxDate = time;
    var curDate = (new Date().getTime() / 1000);
    //console.log(wxDate + " " + curDate);
    var diff = (curDate - wxDate);
    var lastUpdatedTime = Math.round(diff / 60)
    return lastUpdatedTime;
  }
  return 0;
}

// Display the weather data received from the companion
function processWeatherData(data) {
  if(data) {
    console.log("The temperature is: " + JSON.stringify(data));
    //set the weather pull time
    //prevWeatherPullTime = data.wxTime;
    prevWeatherPullTime = (new Date().getTime() / 1000);
    
    //temp
    console.log("prev temp: " + prevTemp + ", curr temp: " + data.temperature)
    if (prevTemp != 999) {
      if (prevTemp < data.temperature) {
        document.getElementById("tempTrend").text = "+";    
      } else if (prevTemp > data.temperature) {
        document.getElementById("tempTrend").text = "-"; 
      } else {
        document.getElementById("tempTrend").text = ""; 
      } 
    }
    document.getElementById("temp").text = Math.round(data.temperature) + "°";
    prevTemp = data.temperature;
    
    //humidity
    //var hum = data.humidity.slice(0, -1);
    var hum = Math.round((data.humidity * 100));
    document.getElementById("hum").text = "h" + hum;   
    document.getElementById("hum").style.fontWeight = "regular";    
    document.getElementById("humTrend").style.fontWeight = "regular";
    document.getElementById("humPercent").style.fontWeight = "regular";
    if (hum < 12) {
      document.getElementById("hum").style.fontWeight = "bold";
      document.getElementById("humTrend").style.fontWeight = "bold";
      document.getElementById("humPercent").style.fontWeight = "bold";
    }
    console.log("prev hum: " + prevHum + ", curr hum: " + hum)
    if (prevHum != 999) {
      if (prevHum < hum) {
        document.getElementById("humTrend").text = "+";    
      } else if (prevHum > hum) {
        document.getElementById("humTrend").text = "-"; 
      } else {
        document.getElementById("humTrend").text = ""; 
      } 
    }
    prevHum = hum;
    
    //weather description
    if (data.weatherDesc == "") {
      document.getElementById("weatherDesc").text = "-----"
    } else {
      document.getElementById("weatherDesc").text = capitalizeFirstLetter(data.weatherDesc);    
      if (document.getElementById("weatherDesc").text.length < 18) {
        document.getElementById("weatherDesc").style.fontSize = 27;
      } else if (document.getElementById("weatherDesc").text.length < 23) {
        document.getElementById("weatherDesc").style.fontSize = 24;
      } else {
        document.getElementById("weatherDesc").style.fontSize = 17;
      }      
    }

    //dew point temp spread
    var td = (Math.round(data.temperature) - Math.round(data.dewpoint));
    document.getElementById("dewpoint").text = "td" + td + "°";
    console.log("prev dp: " + prevDP + ", curr dp: " + data.dewpoint)
    if (prevDP != 999) {
      if (prevDP < td) {
        document.getElementById("dpTrend").text = "+";    
      } else if (prevDP > td) {
        document.getElementById("dpTrend").text = "-"; 
      } else {
        document.getElementById("dpTrend").text = ""; 
      } 
    }
    document.getElementById("dewpoint").style.fontWeight = "regular";
    document.getElementById("dpTrend").style.fontWeight = "regular";
    if (td < 6 || td > 54) {
      document.getElementById("dewpoint").style.fontWeight = "bold";
      document.getElementById("dpTrend").style.fontWeight = "bold";
    } 
    prevDP = td;
    
    //UV 
    var sol = null;
    if (data.uv == "--") {
      sol == data.uv;
    } else {
      //sol = (Math.round(data.uv * .1));
      sol = Math.round(data.uv);
      document.getElementById("uv").text = "uv" + sol;
      document.getElementById("uv").style.fontWeight = "regular";
      document.getElementById("uvTrend").style.fontWeight = "regular";
      
      if (sol < 3) {
        document.getElementById("uv").style.fill = "lime";
        document.getElementById("uvTrend").style.fill = "lime";
      } else if (sol > 2 && sol < 6) {
          document.getElementById("uv").style.fill = "yellow";
          document.getElementById("uvTrend").style.fill = "yellow";
      } else if (sol > 5 && sol < 8) {
          document.getElementById("uv").style.fill = "orange";
          document.getElementById("uvTrend").style.fill = "orange";
      } else if (sol > 7 && sol < 11) {
          document.getElementById("uv").style.fill = "red";
          document.getElementById("uvTrend").style.fill = "red";
      } else {
          document.getElementById("uv").style.fill = "MAGENTA";
          document.getElementById("uvTrend").style.fill = "MAGENTA";
      }
      if (sol > 6) {
        document.getElementById("uv").style.fontWeight = "bold";
        document.getElementById("uvTrend").style.fontWeight = "bold";
      }
      console.log("prev uv: " + prevUV + ", curr uv: " + data.uv)
      if (prevUV != 999) {
        if (prevUV < data.uv) {
          document.getElementById("uvTrend").text = "+";    
        } else if (prevUV > data.uv) {
          document.getElementById("uvTrend").text = "-"; 
        } else {
          document.getElementById("uvTrend").text = ""; 
        } 
      }      
    }
    prevUV = data.uv;    
    
    //time since weather station last updated
    let lut = processPrevWeatherPullDifTime(data.wxTime);
    setTimeUI(lut);
    
    //windspeed
    if (data.winddir > 347 && data.winddir <= 22) {
      data.winddir = 'N';    
    } else if  (data.winddir > 22 && data.winddir <= 67) {
      data.winddir = 'NE';   
    } else if (data.winddir > 67 && data.winddir <= 112) {
      data.winddir = 'E';            
    } else if (data.winddir > 112 && data.winddir <= 157) {
      data.winddir = 'SE';   
    } else if (data.winddir > 157 && data.winddir <= 202) {
      data.winddir = 'S';   
    } else if (data.winddir > 202 && data.winddir <= 247) {
      data.winddir = 'SW';   
    } else if (data.winddir > 247 && data.winddir <= 302) {
      data.winddir = 'W';   
    }else if (data.winddir > 302 && data.winddir <= 347) {
      data.winddir = 'NW';   
    }
    if (data.windspeed === 0) {
      document.getElementById("windspeed").text = 'Calm';
      document.getElementById("windspeed").style.fontWeight = "regular";  
    } else if (data.windspeed < 5) {
      document.getElementById("windspeed").text = 'Light & Variable';
      document.getElementById("windspeed").style.fontWeight = "regular";  
    } else {
      document.getElementById("windspeed").text = Math.round(data.windspeed) + "(" + Math.round(data.windgust) + ")mph " + data.winddir;
      document.getElementById("windspeed").style.fontWeight = "regular";  
    }
    if (data.windspeed > 19) {
      document.getElementById("windspeed").style.fontWeight = "bold";
    }
    
    // weather data color based on temp
    if (Math.round(data.temperature) < "0") {
      var veryCold = "#3377ff";
      document.getElementById("temp").style.fill = veryCold;
      document.getElementById("tempTrend").style.fill = veryCold;
      document.getElementById("hum").style.fill = veryCold;
      document.getElementById("humPercent").style.fill = veryCold;
      document.getElementById("humTrend").style.fill = veryCold;
      document.getElementById("weatherDesc").style.fill = veryCold;
      document.getElementById("windspeed").style.fill = veryCold;
      document.getElementById("dewpoint").style.fill = veryCold;
      document.getElementById("dpTrend").style.fill = veryCold;
      //document.getElementById("uvTrend").style.fill = veryCold;
      document.getElementById("wxTime").style.fill = veryCold;
      //document.getElementById("uv").style.fill = veryCold;
      document.getElementById("raintoday").style.fill = veryCold;
    }  
    else if (Math.round(data.temperature) < "32") {
      var cold = "#99bbff";
      document.getElementById("temp").style.fill = cold;
      document.getElementById("tempTrend").style.fill = cold;
      document.getElementById("hum").style.fill = cold;
      document.getElementById("humPercent").style.fill = cold;
      document.getElementById("humTrend").style.fill = cold;
      document.getElementById("weatherDesc").style.fill = cold;
      document.getElementById("windspeed").style.fill = cold;
      document.getElementById("dewpoint").style.fill = cold;
      document.getElementById("dpTrend").style.fill = cold;
      //document.getElementById("uvTrend").style.fill = cold;
      document.getElementById("wxTime").style.fill = cold;
      //document.getElementById("uv").style.fill = cold;
      document.getElementById("raintoday").style.fill = cold;
    }
    else if (Math.round(data.temperature) < "65") {
      var cool = "#adebeb";
      document.getElementById("temp").style.fill = cool;
      document.getElementById("tempTrend").style.fill = cool;
      document.getElementById("hum").style.fill = cool;
      document.getElementById("humPercent").style.fill = cool;
      document.getElementById("humTrend").style.fill = cool;
      document.getElementById("weatherDesc").style.fill = cool;
      document.getElementById("windspeed").style.fill = cool;
      document.getElementById("dewpoint").style.fill = cool;
      document.getElementById("dpTrend").style.fill = cool;
      //document.getElementById("uvTrend").style.fill = cool;      
      document.getElementById("wxTime").style.fill = cool;
      //document.getElementById("uv").style.fill = cool;
      document.getElementById("raintoday").style.fill = cool;
    }
    else if (Math.round(data.temperature) < "85") {
      var warm = "lime";
      document.getElementById("temp").style.fill = warm;
      document.getElementById("tempTrend").style.fill = warm;
      document.getElementById("hum").style.fill = warm;
      document.getElementById("humPercent").style.fill = warm;
      document.getElementById("humTrend").style.fill = warm;
      document.getElementById("weatherDesc").style.fill = warm;
      document.getElementById("windspeed").style.fill = warm;
      document.getElementById("dewpoint").style.fill = warm;
      document.getElementById("dpTrend").style.fill = warm;
      //document.getElementById("uvTrend").style.fill = warm;
      document.getElementById("wxTime").style.fill = warm;
      //document.getElementById("uv").style.fill = warm;
      document.getElementById("raintoday").style.fill = warm;
    }
    else if (Math.round(data.temperature) < "100") {
      var hot = "#ffb399";
      document.getElementById("temp").style.fill = hot;
      document.getElementById("tempTrend").style.fill = hot;
      document.getElementById("hum").style.fill = hot;
      document.getElementById("humPercent").style.fill = hot;
      document.getElementById("humTrend").style.fill = hot;
      document.getElementById("weatherDesc").style.fill = hot;
      document.getElementById("windspeed").style.fill = hot;
      document.getElementById("dewpoint").style.fill = hot;
      document.getElementById("dpTrend").style.fill = hot;
      //document.getElementById("uvTrend").style.fill = hot;      
      document.getElementById("wxTime").style.fill = hot;
      //document.getElementById("uv").style.fill = hot;
      document.getElementById("raintoday").style.fill = hot;
    } 
    else {
      var hell = "#ff6633";
      document.getElementById("temp").style.fill = hell;
      document.getElementById("tempTrend").style.fill = hell;
      document.getElementById("hum").style.fill = hell;
      document.getElementById("humPercent").style.fill = hell;
      document.getElementById("humTrend").style.fill = hell;
      document.getElementById("weatherDesc").style.fill = hell;
      document.getElementById("windspeed").style.fill = hell;
      document.getElementById("dewpoint").style.fill = hell;
      document.getElementById("dpTrend").style.fill = hell;
      //document.getElementById("uvTrend").style.fill = hell;      
      document.getElementById("wxTime").style.fill = hell;
      //document.getElementById("uv").style.fill = hell;
      document.getElementById("raintoday").style.fill = hell;   
    }  
  }
}

function processAirQuality(data) {
  console.log("The air quality is: " + JSON.stringify(data));
  if(data) {
    if (data.O3 < 51) {
        document.getElementById("o3Circle").style.fill = "#00CC00";
    } else if (data.O3 < 101) {
        document.getElementById("o3Circle").style.fill = "#FFFF00";
    } else if (data.O3 < 151) {
        document.getElementById("o3Circle").style.fill = "#FF6600";
    } else if (data.O3 < 201) {
        document.getElementById("o3Circle").style.fill = "#FF0000";
    } else if (data.O3 < 301) {
        document.getElementById("o3Circle").style.fill = "#99004C";
    } else if (data.O3 > 499) {
        document.getElementById("o3Circle").style.fill = "#7E0023";
    } else {
      document.getElementById("o3Circle").style.fill = "#595959"; 
    }

    if (data.PM2_5 < 51) {
        document.getElementById("pm25Circle").style.fill = "#00CC00";
    } else if (data.PM2_5 < 101) {
        document.getElementById("pm25Circle").style.fill = "#FFFF00";
    } else if (data.PM2_5 < 151) {
        document.getElementById("pm25Circle").style.fill = "#FF6600";
    } else if (data.PM2_5 < 201) {
        document.getElementById("pm25Circle").style.fill = "#FF0000";
    } else if (data.PM2_5 < 301) {
        document.getElementById("pm25Circle").style.fill = "#99004C";
    } else if (data.PM2_5 > 499) {
        document.getElementById("pm25Circle").style.fill = "#7E0023";
    } else {
      document.getElementById("pm25Circle").style.fill = "#595959";
    }
    
    if (data.PM10 < 51) {
        document.getElementById("pm10Circle").style.fill = "#00CC00";
    } else if (data.PM10 < 101) {
        document.getElementById("pm10Circle").style.fill = "#FFFF00";
    } else if (data.PM10 < 151) {
        document.getElementById("pm10Circle").style.fill = "#FF6600";
    } else if (data.PM10 < 201) {
        document.getElementById("pm10Circle").style.fill = "#FF0000";
    } else if (data.PM10 < 301) {
        document.getElementById("pm10Circle").style.fill = "#99004C";
    } else if (data.PM10 > 499) {
        document.getElementById("pm10Circle").style.fill = "#7E0023";
    } else {
      document.getElementById("pm10Circle").style.fill = "#595959";
    }
  } else {
    document.getElementById("pm25Circle").style.fill = "#595959";
    document.getElementById("o3Circle").style.fill = "#595959";
    document.getElementById("pm10Circle").style.fill = "#595959";
  }
}

function processHr24Rain(data) {
  if(data) {
    //raintoday
    console.log("rain today is: " + JSON.stringify(data));
    if (data.hr24Rain == 0) {
      document.getElementById("raintoday").text = "r--";
    } else if (data.hr24Rain < 1) {
      document.getElementById("raintoday").text = "r" + data.hr24Rain.toString().slice(1);  
    } else {
      document.getElementById("raintoday").text = "r" + data.hr24Rain;
    }
    document.getElementById("raintoday").style.fontWeight = "regular";
    if (data.hr24Rain > .24) {
      document.getElementById("raintoday").style.fontWeight = "bold";
    }   
  }
}

/*function processRiverGauge(data) {
  document.getElementById("riverStage").style.fontWeight = "normal";
  document.getElementById("riverStage").text = data.stage + "ft";
  if (data.stage > 6){
    document.getElementById("riverStage").style.fill = "#4d4dff";
  } 
  if (data.stage > 2) {
    document.getElementById("riverStage").style.fontWeight = "bold";            
  }
}*/

//set time UI elements
function setTimeUI (time) {
  document.getElementById("wxTime").style.fontWeight = "regular";
  if (time > 30) {
      document.getElementById("wxTime").style.fontWeight = "bold";
    }
    var lastUpdatedTime;
    if (time < 60) {
      document.getElementById("wxTime").text = time +"m";  
    } else if (time < 6000) {
      //in hours if over 99 minutes ago
      lastUpdatedTime = (time / 60).toFixed(1);      
      document.getElementById("wxTime").text = lastUpdatedTime +"h";
    } else {
      //in days if over 99 hours ago
      lastUpdatedTime = ((time / 60) / 24).toFixed(1);      
      document.getElementById("wxTime").text = lastUpdatedTime +"d";  
    }  
}

// temp showing coastal water/air temps
function processRiverGauge(data) {
  console.log("air/water temp is: " + JSON.stringify(data));
  document.getElementById("riverStage").style.fontWeight = "normal";
  if (data.airTemp && data.waterTemp) {
    document.getElementById("riverStage").text = data.airTemp + "/" + data.waterTemp + "°";
  } else if (data.airTemp) {
    document.getElementById("riverStage").text = data.airTemp + "/--°";
  } else if (data.waterTemp) {
    document.getElementById("riverStage").text = "--/" + data.waterTemp + "°";
  } else {
    document.getElementById("riverStage").text = "--/--°";
  }
  
  if (data.waterTemp) {
    if (data.waterTemp > 74){
      document.getElementById("riverStage").style.fontWeight = "bold";
    }   
  }
}

// Display secondary weather data received from the companion
function processSecondWeatherData(data) {
  console.log("Secondary weather is: " + JSON.stringify(data));
  document.getElementById("riverStage").style.fontWeight = "normal";
  document.getElementById("riverStage").text = Math.round(data.temperature) + "° " + data.weatherDesc;
  //document.getElementById("riverStage2").text = data.windspeed;
  var windInfo = Math.round(data.windspeed) + "(" + Math.round(data.windgust) + ")";
  if (data.windspeed == 0) {
    document.getElementById("riverStage2").text = 'Calm';
    document.getElementById("riverStage2").style.fontWeight = "regular";  
  } else if (data.windgust < 10) {
    document.getElementById("riverStage2").text = 'Li & Var';
    document.getElementById("riverStage2").style.fontWeight = "regular";    
  } else if (windInfo.length > 5){
    document.getElementById("riverStage2").text = windInfo;
    document.getElementById("riverStage2").style.fontWeight = "regular";  
  }
  else {
    document.getElementById("riverStage2").text = windInfo + "mph";
    document.getElementById("riverStage2").style.fontWeight = "regular";   
  }
  if (data.windspeed > 14) {
    document.getElementById("riverStage2").style.fontWeight = "bold";
  }
}

function processIOB(data) {
  console.log("iob is: " + JSON.stringify(data));
  document.getElementById("iob").style.fontWeight = "regular";
  if (data.iob === undefined) {
    document.getElementById("iob").text = "i:NA";
  } else if (data.iob == "0.00" || data.iob == 0) {
    document.getElementById("iob").text = "i:0";
  } else if (data.iob > 0) {
    document.getElementById("iob").style.fontWeight = "bold";    
    document.getElementById("iob").text = "i:" + data.iob;
  }
  else {
    document.getElementById("iob").text = "--";
  }
}

function processEldoraSnow(data) {
  console.log("eldora snow is: " + JSON.stringify(data));
  document.getElementById("eldoraSnow").style.fontWeight = "regular";
  if (data.eldoraSnow === undefined) {
    document.getElementById("eldoraSnow").text = "-";
  } else if (data.eldoraSnow == 0) {
    document.getElementById("eldoraSnow").text = "0";
  } else if (data.eldoraSnow > 0) {
    document.getElementById("eldoraSnow").style.fontWeight = "bold";    
    document.getElementById("eldoraSnow").text = data.eldoraSnow;
  }
  else {
    document.getElementById("eldoraSnow").text = "-";
  }
}

// Display the  data received from the companion
function processOneBg(data) {
  console.log("bg is: " + JSON.stringify(data));
  //setArrowDirection(data.delta)
  // Temp fix for Spike endpoint 
  // Next pull does not get caculated right
   if(data.nextPull === null) {
    data.nextPull = 300000
   }
  
  if(data.nextPull) {
    if(data.units_hint === 'mmol') {
      data.sgv = mmol( data.sgv ) 
      data.delta = mmol( data.delta ) 
    }
    
    document.getElementById("bg").text = Math.round(data.sgv);
    document.getElementById("delta").text = data.delta + ' ' + data.units_hint
    totalSeconds = 0;
    setStatusImage('checked.png')
    //clearTimeout(timeOut);
    //timeOut = setTimeout(fetchCompaionData, data.nextPull) 
  } else {
    document.getElementById("bg").text = '???'
    document.getElementById("delta").text = 'no data'
    //setArrowDirection(0)
    setStatusImage('warrning.png')
    // call function every 10 or 15 mins to check again and see if the data is there   
    //setTimeout(fetchCompaionData, 600000)
    
    document.getElementById("bgColor").gradient.colors.c1 = "#666600";
  }
}

// Listen for the onopen event
messaging.peerSocket.onopen = function() {
  fetchCompaionData();
}

// Event occurs when new file(s) are received
inbox.onnewfile = () => {
  let fileName;
  do {
    // If there is a file, move it from staging into the application folder
    fileName = inbox.nextFile();
    if (fileName) {
      const data = fs.readFileSync('file.txt', 'cbor');
      
      if (data.BGD) {
        const CONST_COUNT = data.BGD.length - 1;
        let count = CONST_COUNT;
      
        //document.getElementById("bg").style.fill="white"
      
        // High || Low alert  
        
        let sgv = data.BGD[count].sgv;
      
        if( data.BGD[CONST_COUNT].units_hint == 'mmol' ){
          sgv = mmol(sgv)
        }
      
        console.log(data.settings.lowThreshold);
        if( sgv >=  data.settings.highThreshold) {
          document.getElementById("bg").style.fill = "orange"
          if((data.BGD[count].delta > 0)){
            console.log('BG HIGH') 
            //startVibration("nudge", 3000, sgv)
            document.getElementById("bgColor").gradient.colors.c1 = "#664200";
          } else {
            console.log('BG still HIGH, But you are going down') 
            showAlertModal = true;
          }
        } else if(sgv <=  data.settings.lowThreshold) {
          document.getElementById("bg").style.fill="#ff0000"
           if((data.BGD[count].delta < 0)){
             console.log('BG LOW') 
             // mute the alert for 20 minutes... 4 pulls from the cgm
             if (numPulls == 0) {
               startVibration("nudge", 8000, sgv);    
             }
             if (numPulls == 5) {
               numPulls = 0;
             } else {
               numPulls++;
             }
             document.getElementById("bgColor").gradient.colors.c1 = "#660000";
           } else {
           console.log('BG still LOW, But you are going UP') 
           showAlertModal = true;
         }
       } else {
         document.getElementById("bg").style.fill="#1a75ff";
         document.getElementById("bgColor").gradient.colors.c1 = "#002966";
       }
       //End High || Low alert      
   
       processOneBg(data.BGD[count])
      
       settings(data.settings, data.BGD[count].units_hint)

      
       // Added by NiVZ    
       let ymin = 999;
       let ymax = 0;
      
       data.BGD.forEach(function(bg, index) {
         if (bg.sgv === undefined) {
           bg.sgv = -1;
         }
         if (bg.sgv < ymin) { ymin = bg.sgv; }
         if (bg.sgv > ymax) { ymax = bg.sgv; }
       })
      
       ymin -=20;
       ymax +=20;
      
       ymin = Math.floor((ymin/10))*10;
       ymax = Math.floor(((ymax+9)/10))*10;
            
       ymin = ymin < 40 ? ymin : 40;
       ymax = ymax < 210 ? 210 : ymax;
      
       high.text = ymax;
       middle.text = Math.floor(ymin + ((ymax-ymin) *0.5));
       low.text = ymin;
      
       //If mmol is requested format
       if( data.BGD[CONST_COUNT].units_hint == 'mmol' ){
        
         high.text = mmol(ymax);
         middle.text = mmol(Math.floor(ymin + ((ymax-ymin) *0.5)));
         low.text = mmol(ymin = ymin < 0 ? 0 : ymin);
         data.BGD[CONST_COUNT].sgv = mgdl(data.BGD[CONST_COUNT].sgv)
       }
      
       myGraph.setLowHigh(data.settings.lowThreshold, data.settings.highThreshold, 100);
       // Set the graph scale
       myGraph.setYRange(ymin, ymax);
       // Update the graph
       myGraph.update(data.BGD);        
      }
      
      //only update the weather every 15+ minutes so we can get meaningful trend info
      if (clearForWeatherDataPull == true) {
        if (data.weather) {
          processWeatherData(data.weather);    
        }
        if (data.airQuality) {
          processAirQuality(data.airQuality);  
        }
        if (data.secondWeather) {
          processSecondWeatherData(data.secondWeather);    
        }
        if (data.fcRain) {
          processHr24Rain(data.fcRain);    
        }
      }  
        //if (data.riverGauge) {
        //  processRiverGauge(data.riverGauge);  
        //}
        //if (data.waterAirInfo) {
        //  processRiverGauge(data.waterAirInfo);  
        // }
      
      if (data.iob) {
        processIOB(data.iob);    
      }
      
      if (data.eldoraSnow) {
        processEldoraSnow(data.eldoraSnow);    
      }
      
      setDate();
      setBattery();
    }
    document.getElementById("companionStatusCircle").style.fill = "#1a75ff";
  } while (fileName);
};

//----------------------------------------------------------
//
// Settings
//
//----------------------------------------------------------
function settings(settings, unitsHint){   
  timeFormat = settings.timeFormat
  let highThreshold = settings.highThreshold
  let lowThreshold =  settings.lowThreshold

  if(unitsHint === "mmol") {
    highThreshold = mgdl( settings.highThreshold )
    lowThreshold = mgdl( settings.lowThreshold )
  }
}



//----------------------------------------------------------
//
// Deals with Vibrations 
//
//----------------------------------------------------------
let vibrationTimeout; 

function startVibration(type, length, message) {
  if(showAlertModal){
    showAlert(message) 
    vibration.start(type);
    if(length){
       vibrationTimeout = setTimeout(function(){ startVibration(type, length, message) }, length);
    }
  }
  
}

function stopVibration() {
  vibration.stop();
  clearTimeout(vibrationTimeout);
}
//----------------------------------------------------------
//
// Alerts
//
//----------------------------------------------------------
let myPopup = document.getElementById("popup");
let btnLeft = myPopup.getElementById("btnLeft");
let btnRight = myPopup.getElementById("btnRight");
let alertHeader = document.getElementById("alertHeader");


function showAlert(message) {
  console.log('ALERT BG')
  console.log(message) 
  alertHeader.text = message
  myPopup.style.display = "inline";
 
}

btnLeft.onclick = function(evt) {
  console.log("Mute");
  // TODO This needs to mute it for 15 mins
  myPopup.style.display = "none";
  stopVibration()
   showAlertModal = false;
}

btnRight.onclick = function(evt) {
  console.log("Snooze");
  myPopup.style.display = "none";
  stopVibration()
}



//----------------------------------------------------------
//
// Action listeners 
//
//----------------------------------------------------------

document.getElementById("status-image").onclick = (e) => {
  vibration.start("nudge");
  fetchCompaionData();
}
 
// document.getElementById("alertBtn").onclick = (e) => {
//   stopVibration()
// }

// Convert a number to a special monospace number
function monoDigits(digits) {
  var ret = "";
  var str = digits.toString();
  for (var index = 0; index < str.length; index++) {
    var num = str.charAt(index);
    ret = ret.concat(hex2a("0x1" + num));
  }
  return ret;
}

// Hex to string
function hex2a(hex) {
  var str = '';
  for (var index = 0; index < hex.length; index += 2) {
    var val = parseInt(hex.substr(index, 2), 16);
    if (val) str += String.fromCharCode(val);
  }
  return str.toString();
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}