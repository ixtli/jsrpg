// Ticker messages
const tickerMessages = ["Click to add a block, shift+click to delete.",
    "Scroll with the WASD keys.", "Move the selection with the arrow keys.",
    "Hold shift and move the selection to select multiple tiles.",
    "Use the + and -, or delete and space keys to add and remove selection.",
    "武器による攻撃や魔法の発動を行います 。", "Now with smoother scrolling!"];

// These shouldn't change without restarting the engine.
var constants = {
    fps: 60,
    cameraFollowsSelection: true,
    fpsCounter: false,
    tileBorderDebug: false,
    debugMessages: true,
    secondarySelectionAlpha: 35,
    alphaSelectionThreshold: 127,
    shadowStep: .1,
};

// * using arrays for attributes to allow multiple bindings to one action
// * TODO user editable eventually? otherwise go back to const
var keys = {
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
    'optimize': [79],           // o
    'pause': [80],              // p
};

// These can (and will be) changed on the fly.
var inputSettings = {
    allowScrolling: true,
    allowBorderScroll: true,
    mouseScrollGranulatiry: 8,
    keyboardScrollGranularity: 32,
    scrollBorder: 32,
    clickToSelect: false,
    mouseMoveDelay: (1000 / constants.fps),
    keyRepeatDelay: (1000 / constants.fps),
}

// debugging
function log(msg)
{
    if (constants.debugMessages == true && typeof(console) != "undefined")
        console.log(msg);
}

// Graphical Constants
// TODO: Move
var lightDistance = 5;
