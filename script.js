// debugging
var tileBorderDebug = false;

// Convenience
const key_w = 87, key_a = 65, key_s = 83, key_d = 68, key_e = 69, key_f = 70,
    key_up = 38, key_down = 40, key_left = 37, key_right = 39, key_plus = 187,
    key_minus = 189, key_delete = 8, key_space = 32;

// Engine settings
const FPS = 30;
const alphaSelectionThreshold = 127;
const mouseMoveDelay = (1000 / FPS);
// This should be really small, so that the OS can regulate it
// we just don't want to be scrolling much faster than once per frame
const keyRepeatDelay = (1000 / FPS);
const scrollBorder = 32;
const reclipThreshold = 16;
const shadowStep = .1;

// Preload images.
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

// Sprites
var tiles = [];

// Controls
var canvas = null;
var buffer = null;
var button = null;

// Drawing contexts
var canvasContext = null;
var bufferCtx = null;

// Animation variables
var interval = null;
var animationOn = false;
var bufferDirty = false;
var previousFrameTime = 0;

// Map
var map = null;
var viewableMap = null;
var viewX = 0, viewY = 0;
var clipStack = [];

// Tile settings
var tileWidth = 64;
var tileHeight = 32;
var tileBorder = 2;

// Sprite selection
var focussed = null;
var mousemoveTimeout;
var allowSelection = true;
var mouseX = 0, mouseY = 0;

// Viewport Scrolling
var clipBuffer = 0;
var allowScrolling = true;
var cameraFollowsSelection = true;

// Mouse movement event handling
var previousMouseMove = new Date();
var mouseScrollGranulatiry = 8;
var mouseInside = false;

// Keyboard event handling
var previousKeyboardEvent = new Date();
var keyboardScrollGranulatiry = 32;
var keyMap = {up: key_w, down: key_s, left: key_a, right: key_d};

window.onload = init;

function init()
{
    // Get the canvas element to display the game in.
    canvas = document.getElementById('display');
    
    // define clipping buffer based on how big our canvas is
    clipBuffer = Math.max(canvas.width, canvas.height) >> 2;
    
    // Create a buffer to draw to and initialize it
    buffer = $('<canvas>')[0];
    buffer.height = canvas.height;
    buffer.width = canvas.width;
    
    // Get graphics contexts for the canvas elements
    canvasContext = canvas.getContext("2d");
    bufferCtx = buffer.getContext("2d");
    
    // Initialize the tiles based on the map
    var t0 = new Date();
    initTiles();
    var t1 = new Date();
    $('#tilegen_time')[0].innerHTML = "Tilegen: "+(t1-t0)+" ms";
    
    map = new DepthSortedArray();
    
    // generate terrain
    t0 = new Date();
    
    /*
    for (var y = 7; y >= 0; y--)
    {
        for (var i = 30; i >= 0; i--)
        {
            for (var j = 30; j >= 0; j--)
            {
                map.insert(tiles[0], j, y, i);
            }
        }
    }
    */
    
    for (var i = 100; i >= 3; i--)
    {
        for (var j = 100; j >= 3; j--)
        {
            map.insert(tiles[0], j, 0, i);
        }
    }
    
    map.insert(tiles[0], 5, 1, 7);
    map.insert(tiles[0], 7, 1, 7);
    map.insert(tiles[0], 8, 1, 6);
    map.insert(tiles[0], 6, 1, 8);
    
    for (var i = 2; i >= 1; i--)
        map.insert(tiles[0], 6, i, 7);
    
    for (var i = 5; i >= 1; i--)
        map.insert(tiles[0], 5, i, 6);
    
    for (var i = 0; i < 4; i++)
        map.insert(tiles[0], 6, i, 6);
    
    for (var i = 0; i < 10; i++)
        map.insert(tiles[0], 5, i, 5);
    
    for (var i = 5; i >= 1; i--)
        map.insert(tiles[0], 5, i, 6);
    
    for (var i = 5; i >= 1; i--)
        map.insert(tiles[0], 6, i, 5);
    
    t1 = new Date();
    
    var msg = "Terrain DSA insertion time: "+ (t1-t0) +"ms"
    msg += " (" + map.data.length + " tiles)";
    $('#insert_time')[0].innerHTML = msg;
    
    t0 = new Date();
    clipStack.push([0, 0, canvas.width, canvas.height]);
    refreshMap(true);
    t1 = new Date();
    
    msg = "Map redraw: " + (t1-t0) + " ms" + " (" + viewableMap.data.length + " tiles)";
    $('#map_redraw')[0].innerHTML = msg;
    
    // Set up mouse move event listener
    $('#display').bind('mouseenter focusin', function() {
        $('#display').bind('mousemove', mouseMoveHandler);
        mouseInside = true;
    });
    
    $('#display').bind('mouseleave focusout', function() {
        $('#display').unbind('mousemove');
        mouseInside = false;
    });
    
    // Set up click handlers
    $(window).bind('mousedown mouseup', mouseClickHandler);
    
    // Set up keyboard handlers
    // @TODO handle keyup with this too
    $(window).bind('keydown', keypressHandler);
    
    // handle ericb mode
    $('#ebmode').bind('click', ericBHandler);
    
    toggleAnimation();
}

function ericBHandler()
{
    // Remap wasd to esdf because EricB complained in #offtopic one day,
    // about how his pinky feels left out when he plays quake that way.
    if (keyMap.right == key_d)
    {
        keyMap.left = key_s;
        keyMap.down = key_d;
        keyMap.right = key_f;
        keyMap.up = key_e;
    } else {
        keyMap.left = key_a;
        keyMap.up = key_w;
        keyMap.down = key_s;
        keyMap.right = key_d;
    }
}

function setSelection(object)
{
    if (focussed)
    {
        redrawObject(focussed);
        focussed.selected = false;
    }
    
    object.selected = true;
    redrawObject(object);
    focussed = object;
}

function keypressHandler(evt)
{
    var time = new Date();
    if (time - previousKeyboardEvent < keyRepeatDelay)
        return;
    
    var delta = false;
    var code = evt.keyCode ? evt.keyCode : evt.which;
    
    switch (code)
    {
        case keyMap.left:
        viewX -= keyboardScrollGranulatiry;
        delta = true;
        break;
        
        case keyMap.up:
        viewY -= keyboardScrollGranulatiry;
        delta = true;
        break;
        
        case keyMap.down:
        viewY += keyboardScrollGranulatiry;
        delta = true;
        break;
        
        case keyMap.right:
        viewX += keyboardScrollGranulatiry;
        delta = true;
        break;
        
        case key_up:
        if (focussed != null)
        {
            var found = objectFurther(focussed);
            if (found != null)
            {
                setSelection(found);
                redrawMap(false);
            }
        }
        break;
        
        case key_left:
        if (focussed != null)
        {
            var found = objectLeft(focussed);
            if (found != null)
            {
                setSelection(found);
                redrawMap(false);
            }
        }
        break;
        
        case key_right:
        if (focussed != null)
        {
            var found = objectRight(focussed);
            if (found != null)
            {
                setSelection(found);
                redrawMap(false);
            }
        }
        break;
        
        case key_down:
        if (focussed != null)
        {
            var found = objectCloser(focussed);
            if (found != null)
            {
                setSelection(found);
                redrawMap(false);
            }
        }
        break;
        
        case key_minus:
        case key_delete:
        if (focussed)
        {
            var index = map.lowestObject(focussed.z, focussed.x);
            
            if (index == null)
                break;
            if (map.data[index] != focussed)
            {
                while(index < map.data.length)
                {
                    if (map.data[index].y >= focussed.y)
                        break;
                    
                    index++;
                }
            } else {
                index = null;
            }
            
            map.deleteObject(focussed);
            if (index) setSelection(map.data[index - 1]);
            clipStack.push(0,0,canvas.width, canvas.height);
            refreshMap(true);
        }
        break;
        
        case key_plus:
        case key_space:
        if (focussed)
        {
            obj = map.insertAbove(focussed, focussed.tile);
            if (obj)
            {
                setSelection(obj);
                refreshMap(true);
            }
        }
        break;
        
        default:
        console.log("Unhandled keycode: " + code);
        break;
    }
    
    if (delta == true)
    {
        var t2 = new Date();
        var recalc = recalculateMapClipping();
        clipStack.push([0, 0, canvas.width, canvas.height]);
        redrawMap(true);
        var t3 = new Date();
        
        msg = "Map redraw: " + (t3-t2) + " ms" + " ("
        msg += viewableMap.data.length + " tiles)";
        if (recalc == true)
            msg += " (recalc)";
        $('#map_redraw')[0].innerHTML = msg;
    }
    
    var t1 = new Date();
    var msg = 'Keypress processing time: '+(t1-time) +' ms';
    $('#selection_time')[0].innerHTML = msg;
    
    return false;
}

function refreshMap(render)
{
    if (viewableMap != null) delete viewableMap;
    
    viewableMap = map.clip(viewX - clipBuffer, viewY - clipBuffer,
        canvas.width + viewX + clipBuffer, canvas.height + viewY + clipBuffer);
    
    if (render == true) redrawMap(true);
}

function mouseClickHandler(ev)
{
    if (focussed == null)
        return;
    else if (ev.type === 'mousedown') ev.preventDefault();
    else if (ev.type === 'mouseup') return true; // for now
    
    
    var obj = null;
    if (ev.shiftKey)
    {
        obj = map.deleteObject(focussed);
        if (obj)
        {
            clipStack.push(0,0,canvas.width, canvas.height);
            focussed = null;
        }
    } else {
        obj = map.insertAbove(focussed, focussed.tile);
        if (obj) redrawObject(obj);
    }
    
    if (obj) refreshMap(true);
    
}

function mouseMoveHandler(evt)
{
    var time = new Date();
    if (time - previousMouseMove < mouseMoveDelay)
        return;
    
    mouseX = evt.pageX;
    mouseY = evt.pageY;
    mouseX -= canvas.offsetLeft;
    mouseY -= canvas.offsetTop;
    
    previousMouseMove = new Date();
    return false;
}

function initTiles()
{
    // eventually this should only build tiles that the map needs...
    
    // Make a new canvas
    var canvas = $('<canvas>')[0];
    canvas.width = tileWidth;
    canvas.height = tileHeight + (tileHeight >> 1) + tileBorder;
    
    // Assemble sprite
    var ctx = canvas.getContext('2d');
    // Draw a red border to see if there are any gaps anywhere.
    if (tileBorderDebug)
    {
        ctx.fillStyle = "rgba(255,0,0,0.25)";
        ctx.fillRect(0,0,canvas.width, canvas.height);
    }
    // Left wall
    ctx.drawImage(dark_wall, 0, (tileHeight >> 1) + 1);
    // Right wall
    ctx.drawImage(dark_wall_right, tileWidth >> 1, (tileHeight >> 1)+1);
    // Tile top
    ctx.drawImage(grass, 0, 0);
    
    // Set up the mapSprites data structure
    tiles.push(canvas);
}

function redrawMap(clear)
{
    // Push context
    bufferCtx.save();
    // Bigin definition of new clipping path
    bufferCtx.beginPath();
    
    while (clipStack.length != 0)
    {
        var obj = clipStack.pop();
        bufferCtx.rect(obj[0], obj[1], obj[2], obj[3]);
    }
    
    // Clip the area of relevant changes
    bufferCtx.clip();
    
    if (clear)
        bufferCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    var d = viewableMap.data;
    for (var i = 0; i < d.length; i++)
    {
        bufferCtx.drawImage(d[i].tile, d[i].px - viewX, d[i].py - viewY);
        if (d[i].selected == true)
        {
            bufferCtx.drawImage(selection, d[i].px - viewX, d[i].py - viewY);
        }
        
        if (d[i].shadow != 0)
        {
            bufferCtx.save();
            bufferCtx.globalAlpha = d[i].shadow;
            bufferCtx.drawImage(shadow, d[i].px - viewX, d[i].py - viewY);
            bufferCtx.restore();
        }
    }
    
    // Get rid of the previous clipping path
    bufferCtx.restore();
    
    bufferDirty = true;
}

function redrawObject(obj)
{
    clipStack.push([obj.px - viewX, obj.py - viewY, obj.w, obj.h]);
}

function toggleAnimation()
{
    if (animationOn == true)
    {
        clearInterval(interval);
        interval = null;
        animationOn = false;
    } else {
        interval = setInterval(draw, 1000 / FPS);
        animationOn = true;
    }
}

function recalculateMapClipping()
{
    var recalc = false;
    
    // A quick optimization for smallish maps
    if (map.data.length == viewableMap.data.length)
        return recalc;
        
    if (viewX - viewableMap.clipx < (clipBuffer >> 1))
        recalc = true;
    else if (viewableMap.clip_width - (viewX + canvas.width) < (clipBuffer >> 1))
        recalc = true;
    else if (viewY - viewableMap.clipy < (clipBuffer >> 1))
        recalc = true;
    else if (viewableMap.clip_height - (viewY + canvas.height) < (clipBuffer >> 1))
        recalc = true;
    
    if (recalc == true)
        refreshMap(false);
    
    return recalc;
}

function windowBorderScroll()
{
    var delta = false;
    if (mouseX < scrollBorder)
    {
        viewX -= mouseScrollGranulatiry;
        delta = true;
    } else if (mouseX > canvas.width - scrollBorder) {
        viewX += mouseScrollGranulatiry;
        delta = true;
    }
    
    if (mouseY < scrollBorder)
    {
        viewY -= mouseScrollGranulatiry;
        delta = true;
    } else if (mouseY > canvas.height - scrollBorder) {
        viewY += mouseScrollGranulatiry;
        delta = true;
    }
    
    if (delta == true)
    {
        var t2 = new Date();
        var recalc = recalculateMapClipping();
        clipStack.push([0, 0, canvas.width, canvas.height]);
        redrawMap(true);
        var t3 = new Date();
        
        msg = "Map redraw: " + (t3-t2) + " ms" + " ("
        msg += viewableMap.data.length + " tiles)";
        if (recalc == true)
            msg += " (recalc)";
        $('#map_redraw')[0].innerHTML = msg;
    }
    
    return delta;
}

function draw()
{
    // Scrolling by leaving the mouse on the side is the only interaction
    // that involves holding a state that we care about
    
    var delta = false;
    if (allowScrolling == true && mouseInside == true)
        delta = windowBorderScroll();
    
    // Handle mouse movement
    if (allowSelection == true &&
        (previousMouseMove > previousFrameTime || delta == true))
    {
        var t0 = new Date();
        var obj = viewableMap.selectObject(mouseX, mouseY);
        
        if (obj)
        {
            setSelection(obj);
            redrawObject(obj);
            redrawMap(false);
            
            var t2 = new Date();
            var msg = 'Selection time: '+(t2-t0) +' ms';
            $('#selection_time')[0].innerHTML = msg;
        }
    }
    
    if (bufferDirty == true)
    {
        canvasContext.clearRect(0,0,canvas.width, canvas.height);
        canvasContext.drawImage(buffer, 0, 0);
        bufferDirty = false;
    }
    
    previousFrameTime = new Date();
}
