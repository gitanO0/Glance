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

import Graph from "graph.js";

let prevTemp = 0;
let prevHum = 0;
let prevDP = 0;
let prevUV = 0;

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

//let numWeatherDataPulls = 3;  //initiize at 3 (15 minutes - 3 data pulls) to allow a first run of the weather process
let prevWeatherPullTime = null;

let timeOut;
// Init 
setTime() 
setDate()
setBattery()
startMonitors() 

// The updater is used to update the screen every 5 SECONDS 
function updater() {
  //setTime()  //no need for the "settime" process to run after the init anymore due to implementaion of clock class
  //setDate()  //moved to the 5 min updater to reduce processing cycles
  setBattery()
  startMonitors()
  addSecond()
}
setInterval(updater, 5000);

// The fiveMinUpdater is used to update the screen every 5 MINUTES 
function fiveMinUpdater() {
  setDate();
  fetchCompaionData();
}

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
}

function startMonitors() {  
  heartRate.start();
  let data = {
      heartRate: heartRate.heartRate ? heartRate.heartRate : 0
  };
  
   let stepCount = (today.local.steps || 0)+"";

   stepCount = (stepCount * .001);
   stepCount = (Math.round(stepCount * 10) / 10);
   stepCount += "k";
  
   document.getElementById("heart").text = JSON.stringify(data.heartRate);
   document.getElementById("step").text = stepCount;
  
   let floorCount = today.local.elevationGain;
   document.getElementById("floors").text = floorCount + "f";
   document.getElementById("floors").style.fontWeight = "regular";
   if (floorCount > 9) {
     document.getElementById("floors").style.fontWeight = "bold";
   } 
  
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
    messaging.peerSocket.send({
      command: cmd,
      heart: heartRate.heartRate,
      steps: today.local.steps
    });
  } else {
    document.getElementById("companionStatusCircle").style.fill = "#ff4d4d";
  }
}

// Listen for the onerror event
messaging.peerSocket.onerror = function(err) {
  // Handle any errors
  console.log("Connection error: " + err.code + " - " + err.message);
  document.getElementById("companionStatusCircle").style.fill = "#e60000";
}

function processPrevWeatherPullDifTime(time) {
  if (time) {
    var wxDate = time;
    var curDate = (new Date().getTime() / 1000);
    console.log(wxDate + " " + curDate);
    var diff = (curDate - wxDate);
    var lastUpdatedMinutes = Math.round(diff / 60)
    document.getElementById("wxTime").text = "+" + lastUpdatedMinutes;
    document.getElementById("wxTime").style.fontWeight = "regular";
    if (lastUpdatedMinutes > 24) {
      document.getElementById("wxTime").style.fontWeight = "bold";
    }
    return lastUpdatedMinutes;
  }
  return 0;
}

// Display the weather data received from the companion
function processWeatherData(data) {
  console.log("The temperature is: " + JSON.stringify(data));
  if(data) {
    //set the weather pull time
    prevWeatherPullTime = data.wxTime;
    
    //temp
    console.log("prev temp: " + prevTemp + ", curr temp: " + data.temperature)
    if (prevTemp != 0) {
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
    var hum = data.humidity.slice(0, -1);
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
    if (prevHum != 0) {
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
    if (prevDP != 0) {
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
    
    //UV  (changed to solar radiation... will fix var names, etc... if decided to keep)
    var sol = null;
    if (data.uv == "--") {
      sol == data.uv;
    } else {
      sol = (Math.round(data.uv * .1));
      document.getElementById("uv").text = "s" + sol;
      document.getElementById("uv").style.fontWeight = "regular";
      document.getElementById("uvTrend").style.fontWeight = "regular";
      if (sol > 79) {
        document.getElementById("uv").style.fontWeight = "bold";
        document.getElementById("uvTrend").style.fontWeight = "bold";
      }
      console.log("prev uv: " + prevUV + ", curr uv: " + data.uv)
      if (prevUV != 0) {
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
    
    //raintoday
    if (data.raintoday == "0.00") {
      document.getElementById("raintoday").text = "r0";
    } else if (data.raintoday =="" || data.raintoday == "-9999.00") {
      document.getElementById("raintoday").text = "r--";
    } else if (data.raintoday < 1) {
      document.getElementById("raintoday").text = "r" + data.raintoday.substr(1);
    } else {
      document.getElementById("raintoday").text = "r" + data.raintoday;  
    }
    document.getElementById("raintoday").style.fontWeight = "regular";
    if (data.raintoday > .15) {
      document.getElementById("raintoday").style.fontWeight = "bold";
    } 
    
    //time since weather station last updated
    processPrevWeatherPullDifTime(data.wxTime);
    
    //windspeed
    document.getElementById("windspeed").text = Math.round(data.windspeed) + "(" + Math.round(data.windgust) + ")mph " + data.winddir;
    document.getElementById("windspeed").style.fontWeight = "regular";
    if (data.windspeed > 19) {
      document.getElementById("windspeed").style.fontWeight = "bold";
    } else
    
    // weather data color based on temp
    if (data.temperature < "32") {
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
      document.getElementById("uvTrend").style.fill = cold;
      document.getElementById("wxTime").style.fill = cold;
      document.getElementById("uv").style.fill = cold;
      document.getElementById("raintoday").style.fill = cold;
    }
    else if (data.temperature < "65") {
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
      document.getElementById("uvTrend").style.fill = cool;      
      document.getElementById("wxTime").style.fill = cool;
      document.getElementById("uv").style.fill = cool;
      document.getElementById("raintoday").style.fill = cool;
    }
    else if (data.temperature < "85") {
      var warm = "#99ff99";
      document.getElementById("temp").style.fill = warm;
      document.getElementById("tempTrend").style.fill = warm;
      document.getElementById("hum").style.fill = warm;
      document.getElementById("humPercent").style.fill = warm;
      document.getElementById("humTrend").style.fill = warm;
      document.getElementById("weatherDesc").style.fill = warm;
      document.getElementById("windspeed").style.fill = warm;
      document.getElementById("dewpoint").style.fill = warm;
      document.getElementById("dpTrend").style.fill = warm;
      document.getElementById("uvTrend").style.fill = warm;
      document.getElementById("wxTime").style.fill = warm;
      document.getElementById("uv").style.fill = warm;
      document.getElementById("raintoday").style.fill = warm;
    }
    else if (data.temperature < "100") {
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
      document.getElementById("uvTrend").style.fill = hot;      
      document.getElementById("wxTime").style.fill = hot;
      document.getElementById("uv").style.fill = hot;
      document.getElementById("raintoday").style.fill = hot;
    } 
  } else if (data.temperature > "99") {
      var hell = "#ff4d4d";
      document.getElementById("temp").style.fill = hell;
      document.getElementById("tempTrend").style.fill = hell;
      document.getElementById("hum").style.fill = hell;
      document.getElementById("humPercent").style.fill = hell;
      document.getElementById("humTrend").style.fill = hell;
      document.getElementById("weatherDesc").style.fill = hell;
      document.getElementById("windspeed").style.fill = hell;
      document.getElementById("dewpoint").style.fill = hell;
      document.getElementById("dpTrend").style.fill = hell;
      document.getElementById("uvTrend").style.fill = hell;      
      document.getElementById("wxTime").style.fill = hell;
      document.getElementById("uv").style.fill = hell;
      document.getElementById("raintoday").style.fill = hell;    
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
  } else {
    document.getElementById("pm25Circle").style.fill = "#595959";
    document.getElementById("o3Circle").style.fill = "#595959";
  }
}

function processRiverGauge(data) {
  document.getElementById("riverStage").text = data.stage + "ft";
  if (data.stage > 6){
    document.getElementById("riverStage").style.fill = "#4d4dff";
  } 
  if (data.stage > 2) {
    document.getElementById("riverStage").style.fontWeight = "bold";            
  }
}

function processIOB(data) {
  console.log("iob is: " + JSON.stringify(data));
  document.getElementById("iob").style.fontWeight = "regular";
  if (data.iob === undefined) {
    document.getElementById("iob").text = "iob NA";
  } else if (data.iob == "0.00" || data.iob == 0) {
    document.getElementById("iob").text = "iob 0";
  } else if (data.iob > 0) {
    document.getElementById("iob").style.fontWeight = "bold";    
    document.getElementById("iob").text = "iob " + data.iob;
  }
  else {
    document.getElementById("iob").text = "--";
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
    clearTimeout(timeOut);
    timeOut = setTimeout(fiveMinUpdater, data.nextPull) 
   
  } else {
    document.getElementById("bg").text = '???'
    document.getElementById("delta").text = 'no data'
    setArrowDirection(0)
    setStatusImage('warrning.png')
    // call function every 10 or 15 mins to check again and see if the data is there   
    setTimeout(fiveMinUpdater, 600000)    
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
          //document.getElementById("bgColor").style.gradient-color1 = "#58130e"
        } else {
          console.log('BG still HIGH, But you are going down') 
          showAlertModal = true;
        }
      }
      else if(sgv <=  data.settings.lowThreshold) {
        document.getElementById("bg").style.fill="#cc0000"
         if((data.BGD[count].delta < 0)){
            console.log('BG LOW') 
           // mute the alert for 20 minutes... 4 pulls from the cgm
            if (numPulls == 0) {
              startVibration("nudge", 3000, sgv);    
            }
            if (numPulls == 5) {
              numPulls = 0;
            } else {
              numPulls++;
            }
            //document.getElementById("bgColor").style.gradient-color1="#58130e"
           } else {
          console.log('BG still LOW, But you are going UP') 
          showAlertModal = true;
        }
      } else {
        document.getElementById("bg").style.fill="#4d94ff"
      }
      //End High || Low alert      
    
      processOneBg(data.BGD[count])
      
      settings(data.settings, data.BGD[count].units_hint)

      
      // Added by NiVZ    
      let ymin = 999;
      let ymax = 0;
      
      data.BGD.forEach(function(bg, index) {
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
      
      if (prevWeatherPullTime == null || processPrevWeatherPullDifTime(prevWeatherPullTime) > 19) {
        if (data.weather) {
          processWeatherData(data.weather);    
        }
        if (data.airQuality) {
          processAirQuality(data.airQuality);  
        }
        if (data.riverGauge) {
          processRiverGauge(data.riverGauge);  
        }
      }
      
      if (data.iob) {
        processIOB(data.iob);    
      }
      document.getElementById("companionStatusCircle").style.fill = "#3385ff";
    }
  } while (fileName);
  //if (fileName) {
  //  fs.unlinkSync('file.txt');
  //}
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
  fiveMinUpdater();
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