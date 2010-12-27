// Ticker messages
const tickerMessages = ["Click to add a block, shift+click to delete.",
    "Scroll with the WASD keys.", "Move the selection with the arrow keys.",
    "Hold shift and move the selection to select multiple tiles.",
    "Use the + and -, or delete and space keys to add and remove selection."];

// Convenience
const key_w = 87, key_a = 65, key_s = 83, key_d = 68, key_e = 69, key_f = 70,
    key_up = 38, key_down = 40, key_left = 37, key_right = 39, key_plus = 187,
    key_minus = 189, key_delete = 8, key_space = 32, key_shift = 16;

// Engine constants.  Things here require restart to change
const FPS = 32;
const mouseMoveDelay = (1000 / FPS);
// This should be really small, so that the OS can regulate it
// we just don't want to be scrolling much faster than once per frame
const keyRepeatDelay = (1000 / FPS);
const scrollBorder = 32;
const reclipThreshold = 0;
const secondarySelectionAlpha = .35;
const doubleBuffer = false;
const cameraFollowsSelection = true;
const tickerChangeRate = 10; // Seconds

// debugging
var tileBorderDebug = false;

// Graphical Constants
const shadowStep = .1;
const alphaSelectionThreshold = 127;
const msgTypeSize = 14;
const msgBorder = 3;
const msgLeftPadding = 8;

// Tile settings
const tileWidth = 64;
const tileHeight = 32;
const tileBorder = 2;

// Engine settings.  Things here can be changed at runtime without maleffect
var allowScrolling = true;
var mouseScrollGranulatiry = 8;
var keyboardScrollGranulatiry = 32;

// Preload images
var selection = new Image();
selection.src = "img/dark-selection.png";
var grass = new Image();
grass.src = "img/grass.png";
var dark_wall = new Image();
dark_wall.src = "img/wall.png";
var dark_wall_right = new Image();
dark_wall_right.src = "img/wall-right.png";
var shadow = new Image();
shadow.src = "img/shadow.png";
