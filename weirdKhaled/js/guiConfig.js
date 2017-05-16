"use strict";

var GuiConfig = GuiConfig || {

};

GuiConfig.controlDefs = [{
    name: "This is covered up",
    type: "slider",
    sliderRange: [0, 20],
    defaultVal: 5,
  },
  
  {
    name: "Fur Length",
    type: "slider",
    sliderRange: [0, 10],
    defaultVal: 2,
  },

  {
    name: "Sheep",
    type: "button",
    defaultVal: Gui.pushSheep,
    isButton: true,
  },
   
  {
    name: "Diablo",
    type: "button",
    defaultVal: Gui.pushDiablo,
    isButton: true,
  },
  
  {
    name: "Hand",
    type: "button",
    defaultVal: Gui.pushHand,
    isButton: true,
  },
];
