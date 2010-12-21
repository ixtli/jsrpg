// debugging
var tileBorderDebug = false;

// Engine settings
const FPS = 30;
const alphaSelectionThreshold = 127;

// Preload images.
var selection = new Image();
selection.src = "img/dark-selection.png"
var grass = new Image();
grass.src = "img/grass.png";
var dark_wall = new Image();
dark_wall.src = "img/wall.png";
var dark_wall_right = new Image();
dark_wall_right.src = "img/wall-right.png";

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
var viewX = 40, viewY = 5;

// Tile settings
var tileWidth = 64;
var tileHeight = 32;
var tileBorder = 2;

// Sprite selection
var focussed = -1;
var mousemoveTimeout;

window.onload = init;

function init()
{
    // Get the canvas element to display the game in.
    canvas = document.getElementById('display');
    
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
    
    for (var i = 50; i >= 3; i--)
    {
        for (var j = 50; j >= 3; j--)
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
    viewableMap = map.clip(viewX, viewY,
        canvas.width + viewX, canvas.height + viewY);
    var tiles_drawn = renderMap();
    t1 = new Date();
    
    msg = "Map redraw: " + (t1-t0) + " ms" + " ("+tiles_drawn+" tiles drawn)";
    $('#map_redraw')[0].innerHTML = msg;
    
    // Set up mouse move event listener
    $('#display').bind('mousemove', mouseMoveHandler);
}

function mouseMoveHandler(evt)
{
    var x = evt.pageX, y = evt.pageY;
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;
    
    if (mousemoveTimeout)
        clearTimeout(mousemoveTimeout);
    
    mousemoveTimeout = setTimeout(function () {
        var old_focussed = focussed;
        var t0 = new Date();
        // Handle mouse movement
        mouseMove(x, y);
        
        // Draw the bounding box for the update
        var tiles_drawn = drawFrameDelta(focussed, old_focussed);
        
        var t2 = new Date();
        var msg = 'Selection time: '+(t2-t0) +' ms ('+tiles_drawn+' tiles drawn)';
        $('#selection_time')[0].innerHTML = msg;
    });
    
    return false;
}

function mouseMove(x, y)
{
    for (var i = viewableMap.data.length - 1; i >=0; i--)
    {
        var obj = viewableMap.data[i];
        if (obj.px - viewX <= x && obj.py - viewY <= y &&
            obj.px - viewX + obj.w > x && obj.py - viewY + obj.h > y)
        {
            var dx = Math.floor(x - (obj.px - viewX));
            var dy = Math.floor(y - (obj.py - viewY));
            var pixeldata = obj.tile.getContext('2d').getImageData(dx,dy,1,1);
            if (pixeldata.data[3] > alphaSelectionThreshold) {
                focussed = i;
                return;
            }
        }
    }
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

function renderMap()
{
    var tiles_drawn = 0;
    var d = viewableMap.data;
    for (var i = 0; i < d.length; i++)
    {
        canvasContext.drawImage(d[i].tile, d[i].px - viewX, d[i].py - viewY);
        if (i == focussed)
        {
            canvasContext.drawImage(selection, d[i].px - viewX, d[i].py - viewY);
            tiles_drawn++;
        }
        tiles_drawn++;
    }
    return tiles_drawn;
}

function drawFrameDelta(new_focus, old_focus)
{
    // This function tell the canvas to be drawn to to restrict updating
    // to a bounding box that only includes the sprite that USED to be
    // in focus, and the one that is in focus now.
    
    canvasContext.save();
    canvasContext.beginPath();
    
    var minx = 0, miny = 0;
    var maxx = canvasContext.width, maxy = canvasContext.height;
    
    var obj = viewableMap.data[old_focus];
    if (obj)
    {
        canvasContext.rect(obj.px - viewX, obj.py - viewY, obj.w, obj.h);
        minx = Math.min(minx, obj.px - viewX);
        miny = Math.min(miny, obj.py - viewY);
        maxx = Math.max(maxx, obj.px - viewX + obj.w);
        maxy = Math.max(maxy, obj.py - viewY + obj.h);
    }
    
    obj = viewableMap.data[new_focus];
    if (obj)
    {
        canvasContext.rect(obj.px - viewX, obj.py - viewY, obj.w, obj.h);
        minx = Math.min(minx, obj.px - viewX);
        miny = Math.min(miny, obj.py - viewY);
        maxx = Math.max(maxx, obj.px - viewX + obj.w);
        maxy = Math.max(maxy, obj.py - viewY + obj.h);
    }
    
    canvasContext.clip();
    // This was here in spritepick, but I dont know why.
    // canvasContext.fillRect(minx, miny, maxx - minx, maxy - miny);
    var tiles_drawn = renderMap();
    canvasContext.restore();
    return tiles_drawn;
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

function draw()
{
    canvasContext.drawImage(buffer, 2, 2);
}
