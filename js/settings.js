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
    secondarySelectionAlpha: .35,
    alphaSelectionThreshold: 127,
    shadowStep: .1,
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
var webkitConsole = false;
function setLogFxn()
{
    if (constants.debugMessages == true && typeof(console) != "undefined")
        webkitConsole = true;
}

setLogFxn();

function log (msg)
{
    if (webkitConsole == true) console.log(msg);
}

// local storage, from diveintohtml5.org
function localStorageIsSupported() {
    try {
        return 'localStorage' in window && window['localstorage'] !== null;
    } catch (e) {
        return false;
    }
}

// Graphical Constants
// TODO: Move
var lightDistance = 5;
