// Ticker messages
const tickerMessages = ["Click to add a block, shift+click to delete.",
    "Scroll with the WASD keys.", "Move the selection with the arrow keys.",
    "Hold shift and move the selection to select multiple tiles.",
    "Use the + and -, or delete and space keys to add and remove selection.",
    "武器による攻撃や魔法の発動を行います 。", "Now with smoother scrolling!"];

// * using arrays for attributes to allow multiple bindings to one action
// * TODO user editable eventually? otherwise go back to const
keys = {
    'move_left':       [37],    // left arrow 
    'move_up':         [38],    // up arrow
    'move_right':      [39],    // right arrow
    'move_down':       [40],    // down arrow
    'scroll_left':     [65],    // a
    'scroll_right':    [68],    // d
    'scroll_down':     [83],    // s
    'scroll_up':       [87],    // w
    'subtract': [109, 189, 46], // subtract, -, delete
    'add':      [107, 187, 32], // add, = (nothing to denote shift state for = ?,
                                // space
    'refresh':  [82],           // r
    'optimize': [79]            // o
};

// Engine constants.  Things here require restart to change
const FPS = 60;
const mouseMoveDelay = (1000 / FPS);
// This should be really small, so that the OS can regulate it
// we just don't want to be scrolling much faster than once per frame
const keyRepeatDelay = (1000 / FPS);
const scrollBorder = 32;
const reclipThreshold = 0;
const secondarySelectionAlpha = .35;
const cameraFollowsSelection = true;
const tickerChangeRate = 10; // Seconds
const fpsCounter = false;

// debugging
const tileBorderDebug = false;
const debugMessages = true;
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
const text_styles = ["black", "red", "green", "blue", "white"];
const text_token = "^";

// Engine settings.  Things here can be changed during runtime without maleffect
var allowScrolling = true;
var allowBorderScroll = true;
var mouseScrollGranulatiry = 8;
var keyboardScrollGranulatiry = 32;
var clickToSelect = false;

