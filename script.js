// debugging
var tileBorderDebug = false;

// Engine settings
const FPS = 30;
const alphaSelectionThreshold = 127;
const mouseMoveDelay = (1000 / FPS);
const scrollBorder = 32;
const reclipThreshold = 16;
const shadowStep = .1;

// Preload images.
var selection = new Image();
selection.src = "img/dark-selection.png"
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

// Map
var map = null;
var viewableMap = null;
var viewX = 0, viewY = 0;

// Tile settings
var tileWidth = 64;
var tileHeight = 32;
var tileBorder = 2;

// Sprite selection
var focussed = -1;
var mousemoveTimeout;
var allowSelection = true;
var mouseX = 0, mouseY = 0;

// Viewport Scrolling
var clipBuffer = 0;
var allowScrolling = true;
var previousMouseMove = new Date();
var mouseScrollGranulatiry = 8;
var mouseInside = false;

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
    $('#display').bind('click', clickHandler);
    
    toggleAnimation();
}

function refreshMap(render)
{
    if (viewableMap != null) delete viewableMap;
    
    viewableMap = map.clip(viewX - clipBuffer, viewY - clipBuffer,
        canvas.width + viewX + clipBuffer, canvas.height + viewY + clipBuffer);
    
    if (render == true) renderMap(true);
}

function clickHandler(ev)
{
    if (focussed == -1)
        return;
    
    if (ev.shiftKey)
    {
        viewableMap.deleteIndex(focussed);
    } else {
        viewableMap.insertAbove(focussed, viewableMap.data[focussed].tile);
    }
    
    refreshMap(true);
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
    
    var old_focussed = focussed;
    var t0 = new Date();
    // Handle mouse movement
    if (allowSelection == true)
    {
        focussed = viewableMap.selectObject(mouseX, mouseY);
        
        // Draw the bounding box for the update
        drawFrameDelta(focussed, old_focussed);
        
        var t2 = new Date();
        var msg = 'Selection time: '+(t2-t0) +' ms';
        $('#selection_time')[0].innerHTML = msg;
    }
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
        ctx.fillRect(0,0,100, 100);
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

function renderMap(clear)
{
    if (clear)
        bufferCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    var d = viewableMap.data;
    for (var i = 0; i < d.length; i++)
    {
        bufferCtx.drawImage(d[i].tile, d[i].px - viewX, d[i].py - viewY);
        if (i == focussed)
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
}

function refreshObject(index, clear)
{
    bufferCtx.save();
    bufferCtx.beginPath();
    
    var minx = 0, miny = 0;
    var maxx = canvasContext.width, maxy = canvasContext.height;
    
    var obj = viewableMap.data[index];
    if (obj)
    {
        bufferCtx.rect(obj.px - viewX, obj.py - viewY, obj.w, obj.h);
        minx = Math.min(minx, obj.px - viewX);
        miny = Math.min(miny, obj.py - viewY);
        maxx = Math.max(maxx, obj.px - viewX + obj.w);
        maxy = Math.max(maxy, obj.py - viewY + obj.h);
    }
    
    bufferCtx.clip();
    renderMap(refresh);
    bufferCtx.restore();
}

function drawFrameDelta(new_focus, old_focus)
{
    // This function tell the canvas to be drawn to to restrict updating
    // to a bounding box that only includes the sprite that USED to be
    // in focus, and the one that is in focus now.
    
    bufferCtx.save();
    bufferCtx.beginPath();
    
    var minx = 0, miny = 0;
    var maxx = canvasContext.width, maxy = canvasContext.height;
    
    var obj = viewableMap.data[old_focus];
    if (obj)
    {
        bufferCtx.rect(obj.px - viewX, obj.py - viewY, obj.w, obj.h);
        minx = Math.min(minx, obj.px - viewX);
        miny = Math.min(miny, obj.py - viewY);
        maxx = Math.max(maxx, obj.px - viewX + obj.w);
        maxy = Math.max(maxy, obj.py - viewY + obj.h);
    }
    
    obj = viewableMap.data[new_focus];
    if (obj)
    {
        bufferCtx.rect(obj.px - viewX, obj.py - viewY, obj.w, obj.h);
        minx = Math.min(minx, obj.px - viewX);
        miny = Math.min(miny, obj.py - viewY);
        maxx = Math.max(maxx, obj.px - viewX + obj.w);
        maxy = Math.max(maxy, obj.py - viewY + obj.h);
    }
    
    bufferCtx.clip();
    renderMap(false);
    bufferCtx.restore();
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

function windowBorderScroll()
{
    var delta = false;
    var recalc = false;
    if (mouseX < scrollBorder)
    {
        viewX -= mouseScrollGranulatiry;
        
        if (viewX - viewableMap.clipx < (clipBuffer >> 1))
            recalc = true;
        
        delta = true;
    } else if (mouseX > canvas.width - scrollBorder) {
        viewX += mouseScrollGranulatiry;
        
        if (viewableMap.clip_width - (viewX + canvas.width) < (clipBuffer >> 1))
            recalc = true;
        
        delta = true;
    }
    
    if (mouseY < scrollBorder)
    {
        viewY -= mouseScrollGranulatiry;
        
        if (viewY - viewableMap.clipy < (clipBuffer >> 1))
            recalc = true;
        
        delta = true;
    } else if (mouseY > canvas.height - scrollBorder) {
        viewY += mouseScrollGranulatiry;
        
        if (viewableMap.clip_height - (viewY + canvas.height) < (clipBuffer >> 1))
            recalc = true;
        
        delta = true;
    }
    
    if (delta == true)
    {
        var t2 = new Date();
        
        // Do we need to recalculate the clipping area?
        if (recalc == true)
            refreshMap(false);
        
        viewableMap.selectObject(mouseX, mouseY);
        drawFrameDelta();
        renderMap(true);
        
        var t3 = new Date();
        
        msg = "Map redraw: " + (t3-t2) + " ms" + " ("
        msg += viewableMap.data.length + " tiles)";
        if (recalc == true)
            msg += " (recalc)";
        $('#map_redraw')[0].innerHTML = msg;
    }
}

function draw()
{
    // Scrolling by leaving the mouse on the side is the only interaction
    // that involves holding a state that we care about
    if (allowScrolling == true && mouseInside == true)
        windowBorderScroll();
    
    canvasContext.clearRect(0,0,canvas.width, canvas.height);
    canvasContext.drawImage(buffer, 0, 0);
}
