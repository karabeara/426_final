// Adapted from Assignment 3b
"use strict";


var Gui = Gui || {
  controlParamsStruct: {},
};

var cam_x = 0;
var cam_y = 40;
var cam_z = 30;
var current_js_object = new THREE.SphereGeometry( 20, 32, 32 );
var current_shells = 120;
var current_fur_len = 2.0;
var current_fur_tex = "jaguar.jpg";
var isThreeGeometry = true;

var isTorus = false;

Gui.init = function() {

  this.meshListDatGui = new dat.GUI();
  this.controlListDatGui = new dat.GUI();

  for (var controlIdx = 0; controlIdx < GuiConfig.controlDefs.length; controlIdx++) {
    var controlDef = GuiConfig.controlDefs[controlIdx];
    this.controlParamsStruct[controlDef.name] = controlDef.defaultVal;
    // }
    this.controlListDatGui.open();
  }
  this.parseUrl();

  for (var controlIdx = 0; controlIdx < GuiConfig.controlDefs.length; controlIdx++) {
    var controlDef = GuiConfig.controlDefs[controlIdx];
    var paramControl = undefined;

    switch (controlDef.type) {
      case "slider":
        paramControl = this.controlListDatGui.add(this.controlParamsStruct, controlDef.name, controlDef.sliderRange[0], controlDef.sliderRange[1]);
        paramControl.step(controlDef.step || controlDef.isFloat && 1 || (controlDef.sliderRange[1] - controlDef.sliderRange[0]) / 20);
        break;
      case "dropdown":
        paramControl = this.controlListDatGui.add(this.controlParamsStruct, controlDef.name, controlDef.dropdownOptions);
        break
      case "color":
        paramControl = this.controlListDatGui.addColor(this.controlParamsStruct, controlDef.name);
        break
      case "string":
        paramControl = this.controlListDatGui.add(this.controlParamsStruct, controlDef.name);
        break
      case "button":
        paramControl = this.controlListDatGui.add(this.controlParamsStruct, controlDef.name);
        break
      default:
    }
    paramControl.onChange(Gui.handleControlsChange);
  }


  this.handleControlsChange();

  this.fullyInitialized = true;
};

Gui.pushSphere = function(newMesh) {
  clearScene();
  cam_x = 0;
  cam_y = 40;
  cam_z = 30;
  current_js_object = new THREE.SphereGeometry( 20, 32, 32 );
  current_shells = 120;
  isThreeGeometry = true;
  isTorus = false;
  generateScene( cam_x, cam_y, cam_z, current_fur_len, current_shells, current_js_object, current_fur_tex, isThreeGeometry );
};

Gui.pushTorus = function(newMesh) {
  clearScene();
  cam_x = 0;
  cam_y = 2;
  cam_z = 8;
  current_fur_len = Math.floor(current_fur_len / 2);
  current_shells = 120;
  current_js_object = new THREE.TorusGeometry( 1, 0.25, 16, 100 );
  isThreeGeometry = true;
  isTorus = true;
  generateScene( cam_x, cam_y, cam_z, current_fur_len, current_shells, current_js_object, current_fur_tex, isThreeGeometry );
};

Gui.pushSheep = function(newMesh) {
  clearScene();
  cam_x = 50;
  cam_y = 50;
  cam_z = 50;
  current_shells = 35;
  current_js_object = "objects/sheep.js";
  isThreeGeometry = false;
  isTorus = false;
  generateScene( cam_x, cam_y, cam_z, current_fur_len, current_shells, "objects/sheep.js", current_fur_tex, isThreeGeometry );
};

Gui.pushDiablo = function(newMesh) {
  clearScene();
  cam_x = 4;
  cam_y = 4;
  cam_z = 2;
  current_fur_len = Math.floor( current_fur_len / 2 );
  current_shells = 30;
  current_js_object = "objects/diablo.js";
  isThreeGeometry = false;
  isTorus = false;
  generateScene( cam_x, cam_y, cam_z, current_fur_len, current_shells, "objects/diablo.js", current_fur_tex, isThreeGeometry );
};

Gui.handleControlsChange = function() {
  if (Gui.suspendDisplayUpdate) return;

  for (var controlIdx = 0; controlIdx < GuiConfig.controlDefs.length; controlIdx++) {
    var controlDef = GuiConfig.controlDefs[controlIdx];
    var val = Gui.controlParamsStruct[controlDef.name];

    switch (controlDef.name) {
      case "Fur Length":
		    clearScene();
        if (current_js_object === "objects/diablo.js") {
          current_fur_len = Math.floor( val / 2 );
        }
        else if ( isTorus ) {
          current_fur_len = Math.floor( val / 2 );
        }
        else {
          current_fur_len = val;
        }
	      // current_fur_len = val;
		    generateScene( cam_x, cam_y, cam_z, current_fur_len, current_shells, current_js_object, current_fur_tex, isThreeGeometry );
        break;
      case "Fur Texture":
        clearScene();
        if (current_js_object === "objects/diablo.js") {
          current_fur_len = Math.floor( current_fur_len / 5 );
        }
        else if ( isTorus ) {
          current_fur_len = Math.floor( current_fur_len );
        }
        current_fur_tex = val;

        generateScene( cam_x, cam_y, cam_z, current_fur_len, current_shells, current_js_object, val, isThreeGeometry );
        break;
      case "Gravity":
      //  Reflection.diffuse = converted_val;
        break;
      case "Rotation":
       // Reflection.specular = converted_val;
        break;
      case "Animation":
       // Reflection.shininess = converted_val;
        break;
      default:
    }
  }
  Gui.updateUrl();
};

Gui.getFilterHistoryData = function() {
  return this.historyFilters;
};

// gets rid of the ".0000000001" etc when stringifying floats
// from http://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript
function stripFloatError(number) {
  if (number && number.toPrecision) {
    return (parseFloat(number.toPrecision(5)));
  } else {
    return number;
  }
};

Gui.parseUrl = function() {
  for (var i = 0; i < Parser.commands.length; i++) {
    var cmd = Parser.commands[i];
  }
};

Gui.getUrl = function() {
  var url = "";
  return url;
};

Gui.updateUrl = function() {
  if (Gui.batchMode) return;

  var url = Gui.batchMode && "batch.html?" || "index.html?";
  url += Gui.getUrl();
  history.pushState({}, "", url);
};

Gui.alertOnce = function(msg, divName) {
  divName = divName || "alert_div";
  // NOTE: mainDiv opacity change disabled to allow >1 different alerts
  // var mainDiv = document.getElementById('main_div');
  // mainDiv.style.opacity = "0.3";
  var alertDiv = document.getElementById(divName);
  alertDiv.innerHTML = '<p>' + msg + '</p><button id="ok" onclick="Gui.closeAlert()">ok</button>';
  alertDiv.style.display = 'inline';
};

Gui.closeAlert = function(divName) {
  divName = divName || "alert_div";
  // NOTE: mainDiv opacity change disabled to allow >1 different alerts
  // var mainDiv = document.getElementById('main_div');
  // mainDiv.style.opacity = "1";
  var alertDiv = document.getElementById(divName);
  alertDiv.style.display = 'none';
};
