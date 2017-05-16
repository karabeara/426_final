"use strict";


var Gui = Gui || {
  controlParamsStruct: {},
};


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

Gui.pushMesh = function(newMesh) {
  
};


Gui.handleControlsChange = function() {
  if (Gui.suspendDisplayUpdate) return;

  for (var controlIdx = 0; controlIdx < GuiConfig.controlDefs.length; controlIdx++) {
    var controlDef = GuiConfig.controlDefs[controlIdx];
    var val = Gui.controlParamsStruct[controlDef.name];
    var converted_val = val;


    switch (controlDef.name) {
      case "Fur Length":
		//height = converted_val;
        break;
      case "Scale":
		clearScene();
		generateScene();
      //  Reflection.ambient = converted_val;
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
/*
  // camera pose
  url += "Camera=";
  url += "[" + stripFloatError(Renderer.cameraPosition.x) + "," + stripFloatError(Renderer.cameraPosition.y) + "," + stripFloatError(Renderer.cameraPosition.z) + "];";
  url += "[" + stripFloatError(Renderer.cameraUpVector.x) + "," + stripFloatError(Renderer.cameraUpVector.y) + "," + stripFloatError(Renderer.cameraUpVector.z) + "];";
  url += "[" + stripFloatError(Renderer.cameraLookAtVector.x) + "," + stripFloatError(Renderer.cameraLookAtVector.y) + "," + stripFloatError(Renderer.cameraLookAtVector.z) + "]";


  for (var meshIdx = 0; meshIdx < this.meshList.length; meshIdx++) {
    var thisMesh = this.meshList[meshIdx];
    url += "&" + "Mesh=" + thisMesh.meshName + ";" + (thisMesh.useMaterial ? "true" : "false");
  }

  for (var controlIdx = 0; controlIdx < GuiConfig.controlDefs.length; controlIdx++) {
    var controlDef = GuiConfig.controlDefs[controlIdx];
    if (controlDef.type == "button") {
      continue;
    }
    url += "&" + controlDef.name + "=";
    var val = this.controlParamsStruct[controlDef.name];

    if (val.constructor === Array) {
      url += "[";
      for (var j = 0; j < val.length; j++) {
        url += (j > 0 && "," || "") + stripFloatError(val[j]);
      }
      url += "]";
    } else {
      url += val;
    }
  }

  url = url.replace(/ /g, "_");
*/
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
