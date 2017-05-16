// Adapted form Assignment 3b
"use strict";

var GuiConfig = GuiConfig || {

};

GuiConfig.furOptions = ['tiger.jpg', 'bear.jpg', 'jaguar.jpg', 'grass.png'];

GuiConfig.controlDefs = [
  {
    name: "",
    type: "button",
    defaultVal: Gui.pushSphere,
    isButton: true,
  },

  {
    name: "Fur Length",
    type: "slider",
    sliderRange: [0, 10],
    defaultVal: 2,
  },

  {
    name: "Sphere",
    type: "button",
    defaultVal: Gui.pushSphere,
    isButton: true,
  },

  {
    name: "Torus",
    type: "button",
    defaultVal: Gui.pushTorus,
    isButton: true,
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
    name: "Fur Texture",
    type: "dropdown",
    defaultVal: GuiConfig.furOptions[0],
    dropdownOptions: GuiConfig.furOptions,
  },

];
