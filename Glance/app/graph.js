import { me as device } from "device";

// Screen dimension fallback for older firmware
if (!device.screen) device.screen = { width: 348, height: 250 };

export default class Graph {
 
 constructor(id) {
 
   this._id = id;
   this._xscale = 0;
   this._yscale = 0;
   this._xmin = 0;
   this._xmax = 0;
   this._ymin = 0;
   this._ymax = 0;
   this._pointsize = 2;   
   
   this._bg = this._id.getElementById("bg");
      
   this._vals = this._id.getElementsByClassName("gval");
   
   //this._tHigh = 170;
   //this._tLow = 70;
 
   this._tHighLine = this._id.getElementById("tHigh");
   this._tLowLine = this._id.getElementById("tLow");
   this._tTargetLine = this._id.getElementById("tTarget");
   
   this._defaultYmin = 40;
   this._defaultYmax = 400;
   
 }
  
 setPosition(x,y){   
   this._id.x = x;
   this._id.y = y;
 }
  
 setLowHigh(low,high,target){
   this._tLow = low;
   this._tHigh = high;
   this._tTarget = target;
 }
  
 setSize(w,h){
   this._width = w;
   this._height = h;   
 } 
  
 setXRange(xmin, xmax){

   this._xmin = xmin;
   this._xmax = xmax;
   this._xscale = (xmax-xmin)/this._width;
   //console.log("XSCALE: " + this._xscale);
   
 }
  
 setYRange(ymin, ymax){
   
   this._ymin = ymin;
   this._ymax = ymax;
   this._yscale = (ymax-ymin)/this._id.height;
   console.log("YSCALE: " + this._yscale);
   
 } 

  getYmin(){
    return this._ymin;
  }
  
  getYmax(){
    return this._ymax;
  }
  
 setBGColor(c){
    this._bgcolor = c;
    this._bg.style.fill = c;
  }
 
  
  
  update(v){
     
   console.log("Updating Graph...");
      
   //this._bg.style.fill = this._bgcolor;
   
   this._tHighLine.y1 = this._id.height - ((this._tHigh-this._ymin) / this._yscale);
   this._tHighLine.y2 = this._id.height - ((this._tHigh-this._ymin) / this._yscale);
    
   this._tLowLine.y1 = this._id.height - ((this._tLow-this._ymin) / this._yscale);
   this._tLowLine.y2 = this._id.height - ((this._tLow-this._ymin) / this._yscale);
   
   this._tTargetLine.y1 = this._id.height - ((this._tTarget-this._ymin) / this._yscale);
   this._tTargetLine.y2 = this._id.height - ((this._tTarget-this._ymin) / this._yscale);
   
    
   for (var index = 0; index < this._vals.length; index++) {
     // when first starting up a new sensor, the web service won't send back data for the bg values...
     // need to set those bg circle objects to a bogus value and not just undefined.
     if (this._vals[index].sgv === undefined) {
       this._vals[index].sgv = -1;
     }
     //console.log(`V${index}: ${v[index].sgv}`);
     
     //console.log("SGV" + index + ": " + v[index].sgv + " TIME: " + v[index].date);
     //this._vals[index].cx = this._width - ((v[index].date-this._xmin) / this._xscale);
     this._vals[index].cy = this._id.height - ((v[index].sgv-this._ymin) / this._yscale);
     
     //this._vals[index].cy = this._height - 20;
     //this._vals[index].r = this._pointsize;
     
     if (v[index].sgv > this._tHigh) {
       this._vals[index].style.fill = "orange";
     } else if (v[index].sgv < 0) {
       this._vals[index].style.fill = "#ad33ff";
     } else if (v[index].sgv < this._tLow) {
       this._vals[index].style.fill = "#cc0000";
     }    
     else {
       this._vals[index].style.fill = "#4d94ff";
     }
   }
   
   
 }
  
};
