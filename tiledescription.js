// preload images
var terrainImage = new Image();
terrainImage.src = "img/terrain.png";

// TODO: move this
var kirbyPortrait = new Image();
kirbyPortrait.src = "img/kirby_portrait.jpg";

// Tile settings
const tileWidth = 64;
const tileHeight = 32;
const tileBorder = 2;

// Names of each tile for the editor
terrainNames = ["grass", "night", "black", "grass",
                "grass", "grass", "grass", "grass",
                "grass", "grass", "grass", "grass"];

const mouseOverSelection = 1;
const secondarySelectionSprite = 1;
const shadowMaskTile = 2;

const tileGraphicWidth = 64;
const tileGraphicHeight = 50;
const tileSheetWidth = 4;
const tileSheetHeight = 3;

var kirbyImage = new Image();
kirbyImage.src = "img/kirby.png";
const kirbySheetWidth = 12;
const kirbySheetHeight = 1;
const kirbyWalkingSpeed = 200;

