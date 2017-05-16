"use strict";

var GuiConfig = GuiConfig || {

};

GuiConfig.meshFileNames = [
	'sheep.js',
	'diablo.js',
];

GuiConfig.controlDefs = [{
    name: "Fur Length",
    type: "slider",
    sliderRange: [0, 20],
    defaultVal: 5,
  },

  {
    name: "Sheep",
    type: "button",
    defaultVal: Gui.pushSheep,
    isButton: true,
  },
  
   {
    name: "Sheep with long fur",
    type: "button",
    defaultVal: Gui.pushSheepLong,
    isButton: true,
  },
  
  {
    name: "Diablo",
    type: "button",
    defaultVal: Gui.pushDiablo,
    isButton: true,
  },
];
