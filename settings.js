// Ticker messages
const tickerMessages = ["Click to add a block, shift+click to delete.",
    "Scroll with the WASD keys.", "Move the selection with the arrow keys.",
    "Hold shift and move the selection to select multiple tiles.",
    "Use the + and -, or delete and space keys to add and remove selection.",
    "武器による攻撃や魔法の発動を行います 。"];

// Convenience
const key_w = 87, key_a = 65, key_s = 83, key_d = 68, key_e = 69, key_f = 70,
    key_up = 38, key_down = 40, key_left = 37, key_right = 39, key_plus = 187,
    key_minus = 189, key_delete = 8, key_space = 32, key_shift = 16;

// Engine constants.  Things here require restart to change
const FPS = 100;
const mouseMoveDelay = (1000 / FPS);
// This should be really small, so that the OS can regulate it
// we just don't want to be scrolling much faster than once per frame
const keyRepeatDelay = (1000 / FPS);
const scrollBorder = 32;
const reclipThreshold = 0;
const secondarySelectionAlpha = .35;
const bufferWidth = 1600;
const bufferHeight = 800;
const cameraFollowsSelection = true;
const tickerChangeRate = 10; // Seconds
const fpsCounter = false;

// debugging
var tileBorderDebug = false;
var debugMessages = true;
function log(msg)
{
    if (debugMessages == true && typeof(console) != "undefined")
        console.log(msg);
}

// Graphical Constants
const shadowStep = .1;
const alphaSelectionThreshold = 127;
const msgTypeSize = 14;
const msgBorder = 3;
const msgLeftPadding = 8;

// Engine settings.  Things here can be changed during runtime without maleffect
var allowScrolling = true;
var allowBorderScroll = true;
var mouseScrollGranulatiry = 8;
var keyboardScrollGranulatiry = 32;
var clickToSelect = false;

