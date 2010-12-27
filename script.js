// Convenience
const key_w = 87, key_a = 65, key_s = 83, key_d = 68, key_e = 69, key_f = 70,
    key_up = 38, key_down = 40, key_left = 37, key_right = 39, key_plus = 187,
    key_minus = 189, key_delete = 8, key_space = 32, key_shift = 16;

// Engine settings
const FPS = 32;
const mouseMoveDelay = (1000 / FPS);
// This should be really small, so that the OS can regulate it
// we just don't want to be scrolling much faster than once per frame
const keyRepeatDelay = (1000 / FPS);
const scrollBorder = 32;
const reclipThreshold = 0;
const secondarySelectionAlpha = .35;

// Animation variables
var interval = null;
var animationOn = false;
var previousFrameTime = 0;

// Map
var map = null;
var viewableMap = null;
var viewX = 0, viewY = 0;

// Sprite selection
var focussed = null;
var allowSelection = true;
var mouseX = 0, mouseY = 0;
var extendedSelection = [];

// Viewport Scrolling
var clipBuffer = 0;
var allowScrolling = true;
var cameraFollowsSelection = true;
var viewportIsScrolling = false;

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
    viewWidth = canvas.width;
    viewHeight = canvas.height;
    
    // define clipping buffer based on how big our canvas is
    clipBuffer = Math.max(viewWidth, viewHeight) >> 2;
    
    // Create a buffer to draw to and initialize it
    buffer = $('<canvas>')[0];
    buffer.height = viewHeight;
    buffer.width = viewWidth;
    
    // Get graphics contexts for the canvas elements
    canvasContext = canvas.getContext("2d");
    bufferCtx = buffer.getContext("2d");
    
    // Init forground and background canvas
    setBackgroundLinearVerticalGradient();
    setOverlayWhiteVerticalGradient();
    
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
    
    for (var i = 25; i >= 0; i--)
    {
        for (var j = 25; j >= 0; j--)
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
    clipStack.push([0, 0, viewWidth, viewHeight]);
    refreshMap(true);
    t1 = new Date();
    
    msg = "Map redraw: " + (t1-t0) + " ms" + " (" + viewableMap.data.length + " tiles)";
    $('#map_redraw')[0].innerHTML = msg;
    
    configureEventBindings();
    
    setMessage("武器による攻撃や魔法の発動を行います。");
    
    toggleAnimation();
}

function configureEventBindings()
{
    // Set up mouse move event listener
    $('#game').bind('mouseenter focusin', function() {
        $('#game').bind('mousemove', mouseMoveHandler);
        mouseInside = true;
    });
    
    $('#game').bind('mouseleave focusout', function() {
        $('#game').unbind('mousemove');
        mouseInside = false;
    });
    
    // Set up click handlers
    $(window).bind('mousedown mouseup', mouseClickHandler);
    
    // Set up keyboard handlers
    // @TODO handle keyup with this too
    $(window).bind('keydown', keypressHandler);
    
    // handle ericb mode
    $('#ebmode').bind('click', ericBHandler);
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

function setSelection(object, keepInViewport)
{
    // Deselect the previously focussed object
    if (focussed != null)
    {
        redrawObject(focussed);
        focussed.selected = false;
    }
    
    // Select object
    object.selected = true;
    focussed = object;
    
    // If we're trying to keep selection in view, figure out if it left
    var delta = false;
    if (cameraFollowsSelection == true && keepInViewport == true)
    {
        if (object.px < viewX + scrollBorder)
        {
            viewX = object.px - scrollBorder;
            delta = true;
        } else if (object.px + object.w > viewX + viewWidth - scrollBorder) {
            viewX = (object.px + object.w + scrollBorder) - viewWidth;
            delta = true;
        }
        
        if (object.py < viewY + scrollBorder)
        {
            viewY = object.py - scrollBorder;
            delta = true;
        } else if (object.py + object.h > viewY + viewHeight - scrollBorder){
            viewY = (object.py + object.h + scrollBorder) - viewHeight;
            delta = true;
        }
    }
    
    // If it left, redraw the map
    if (delta == true)
    {
        var t2 = new Date();
        recalculateMapClipping();
        redrawMap(true, false);
        var t3 = new Date();
        
        msg = "Map redraw: " + (t3-t2) + " ms" + " ("
        msg += viewableMap.data.length + " tiles)";
        $('#map_redraw')[0].innerHTML = msg;
    } else {
        redrawObject(object);
        redrawMap(false, true);
    }
}

function addToExtendedSelection(obj)
{
    // Don't add duplicates
    for (var i = 0; i < extendedSelection.length; i++)
        if (obj === extendedSelection[i])
            return null;
    
    // Add it by reference
    extendedSelection.splice(extendedSelection.length, 0, obj);
    extendedSelection[extendedSelection.length - 1].secondary_selection = true;
    
    // We rely on the caller to decide to update the map or not,
    // since this could be called many times in a loop
    redrawObject(extendedSelection[extendedSelection.length -1]);
    
    // Return it's index
    return extendedSelection.length - 1;
}

function clearExtendedSelection()
{
    for (var i = 0; i < extendedSelection.length; i++)
    {
        extendedSelection[i].secondary_selection = false;
        redrawObject(extendedSelection[i]);
    }
    
    redrawMap(true, true);
    extendedSelection = [];
}

function insertAboveExtendedSelection()
{
    if (extendedSelection.length == 0)
        return;
    
    var newSelection = [];
    var tmp;
    
    for (var i = 0; i < extendedSelection.length; i++)
    {
        tmp = map.insertAboveObject(extendedSelection[i],
            extendedSelection[i].tile);
        if (tmp != null)
        {
            newSelection.splice(newSelection.length, 0, tmp);
            tmp.secondary_selection = true;
            extendedSelection[i].secondary_selection = false;
            redrawObject(tmp);
            redrawObject(extendedSelection[i]);
        }
    }
    
    refreshMap(false);
    clearExtendedSelection(); // This calls redraw map
    extendedSelection = newSelection;
}

function deleteExtendedSelection()
{
    if (extendedSelection.length == 0)
        return false;
    
    var newSelection = [];
    
    for (var i = 0; i < extendedSelection.length; i++)
    {
        var index = map.lowestObject(extendedSelection[i].z,
            extendedSelection[i].x);
        
        if (index != null)
        {
            if (map.data[index] != extendedSelection[i])
            {
                while(index++ < map.data.length)
                {
                    if (map.data[index].x != extendedSelection[i].x ||
                        map.data[index].z != extendedSelection[i].z)
                    {
                        index--;
                        break;
                    }
                    
                    if (map.data[index].y >= extendedSelection[i].y)
                    {
                        index--;
                        break;
                    }
                }
            } else {
                index = null;
            }
        }
        
        if (index != null)
        {
            newSelection.splice(newSelection.length, 0, map.data[index]);
            map.data[index].secondary_selection = true;
        }
        
        if (extendedSelection[i] === focussed)
            focussedWasDeleted();
        
        map.deleteObject(extendedSelection[i]);
    }
    
    delete extendedSelection;
    extendedSelection = newSelection;
    
    return true;
}

function focussedWasDeleted()
{
    // This method causes the selection to "fall" to the next lowest object
    index = map.lowestObject(focussed.z, focussed.x);
    
    if (index == null)
        return;
    
    if (map.data[index] != focussed)
    {
        while(index < map.data.length)
        {
            if (map.data[index].x != focussed.x ||
                map.data[index].z != focussed.z)
            {
                index--;
                break;
            }
            
            if (map.data[index].y >= focussed.y)
                break;
            
            index++;
        }
    } else {
        index = null;
    }
    
    // TODO: the following call to setSelection could redraw the
    // map twice if delta is set.  Deal with this.
    if (index != null)
        setSelection(map.data[index], true);
    else
        focussed = null;
}

function keypressHandler(evt)
{
    var time = new Date();
    if (time - previousKeyboardEvent < keyRepeatDelay)
        return;
    
    var delta = false;
    var code = evt.keyCode ? evt.keyCode : evt.which;
    
    // Ignore when the user intially presses the shift key: we only care
    // if it's down when something else happens.  If we don't return false
    // safari sends a mousemove event which screws up selection.  Weird.
    if (code == key_shift)
        return true;
    
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
            // Handle selecting multiple objects
            if (evt.shiftKey)
                addToExtendedSelection(focussed);
            else if (extendedSelection.length > 0)
                clearExtendedSelection();
            
            var found = objectFurther(focussed);
            if (found != null)
                setSelection(found, true);
        }
        break;
        
        case key_left:
        if (focussed != null)
        {
            // Handle selecting multiple objects
            if (evt.shiftKey)
                addToExtendedSelection(focussed);
            else if (extendedSelection.length > 0)
                clearExtendedSelection();
            
            var found = objectLeft(focussed);
            if (found != null)
                setSelection(found, true);
        }
        break;
        
        case key_right:
        if (focussed != null)
        {
            // Handle selecting multiple objects
            if (evt.shiftKey)
                addToExtendedSelection(focussed);
            else if (extendedSelection.length > 0)
                clearExtendedSelection();
            
            var found = objectRight(focussed);
            if (found != null)
                setSelection(found, true);
        }
        break;
        
        case key_down:
        if (focussed != null)
        {
            // Handle selecting multiple objects
            if (evt.shiftKey)
                addToExtendedSelection(focussed);
            else if (extendedSelection.length > 0)
                clearExtendedSelection();
            
            var found = objectCloser(focussed);
            if (found != null)
                setSelection(found, true);
        }
        break;
        
        case key_minus:
        case key_delete:
        if (extendedSelection.length > 0)
        {
            deleteExtendedSelection();
            refreshMap(false);
            delta = true;
        } else if (focussed != null) {
            map.deleteObject(focussed);
            focussedWasDeleted();
            refreshMap(false);
            delta = true;
        }
        break;
        
        case key_plus:
        case key_space:
        // handle multiple selections
        if (extendedSelection.length > 0)
        {
            insertAboveExtendedSelection();
        } else if (focussed != null) {
            obj = map.insertAboveObject(focussed, focussed.tile);
            if (obj)
            {
                setSelection(obj, true);
                refreshMap(true);
            }
        }
        break;
        
        default:
        console.log("Unhandled keycode: " + code);
        return true;
        break;
    }
    
    if (delta == true)
    {
        var t2 = new Date();
        recalculateMapClipping();
        redrawMap(true, false);
        var t3 = new Date();
        
        msg = "Map redraw: " + (t3-t2) + " ms" + " ("
        msg += viewableMap.data.length + " tiles)";
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
        viewWidth + viewX + clipBuffer, viewHeight + viewY + clipBuffer);
    
    if (render == true) redrawMap(true, false);
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
            clipStack.push(0,0,viewWidth, viewHeight);
            focussed = null;
        }
    } else {
        obj = map.insertAboveObject(focussed, focussed.tile);
        if (obj) redrawObject(obj);
    }
    
    if (obj) refreshMap(true);
    
}

function mouseMoveHandler(evt)
{
    var time = new Date();
    if (time - previousMouseMove < mouseMoveDelay)
        return;
    
    mouseX = evt.pageX - canvas.offsetLeft;
    mouseY = evt.pageY - canvas.offsetTop;
    
    previousMouseMove = new Date();
    return false;
}

function initTiles()
{
    // eventually this should only build tiles that the map needs...
    
    // Make a new canvas
    var c = $('<canvas>')[0];
    c.width = tileWidth;
    c.height = tileHeight + (tileHeight >> 1) + tileBorder;
    
    // Assemble sprite
    var ctx = c.getContext('2d');
    // Draw a red border to see if there are any gaps anywhere.
    if (tileBorderDebug)
    {
        ctx.fillStyle = "rgba(255,0,0,0.25)";
        ctx.fillRect(0,0,viewWidth, viewHeight);
    }
    // Left wall
    ctx.drawImage(dark_wall, 0, (tileHeight >> 1) + 1);
    // Right wall
    ctx.drawImage(dark_wall_right, tileWidth >> 1, (tileHeight >> 1)+1);
    // Tile top
    ctx.drawImage(grass, 0, 0);
    
    // Set up the mapSprites data structure
    tiles.push(c);
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
    else if (viewableMap.clip_width - (viewX + viewWidth) < (clipBuffer >> 1))
        recalc = true;
    else if (viewY - viewableMap.clipy < (clipBuffer >> 1))
        recalc = true;
    else if (viewableMap.clip_height - (viewY + viewHeight) < (clipBuffer >> 1))
        recalc = true;
    
    if (recalc == true)
        refreshMap(false);
    
    return recalc;
}

function draw()
{
    // Scrolling by leaving the mouse on the side is the only interaction
    // that involves holding a state that we care about.  If we detect that
    // the mouse is in the scroll border save that state so that renderMap
    // will only redraw the entire screen if it's currently scrolling.
    if (allowScrolling == true && mouseInside == true)
    {
        if (mouseX < scrollBorder)
        {
            viewX -= mouseScrollGranulatiry;
            viewportIsScrolling = true;
        } else if (mouseX > viewWidth - scrollBorder) {
            viewX += mouseScrollGranulatiry;
            viewportIsScrolling = true;
        } else {
            viewportIsScrolling = false;
        }
        
        if (mouseY < scrollBorder)
        {
            viewY -= mouseScrollGranulatiry;
            viewportIsScrolling = true;
        } else if (mouseY > viewHeight - scrollBorder) {
            viewY += mouseScrollGranulatiry;
            viewportIsScrolling = true;
        }
        
        if (viewportIsScrolling == true)
            recalculateMapClipping();
    } else {
        viewportIsScrolling = false;
    }
    
    // Handle mouse movement
    if (allowSelection == true &&
        (previousMouseMove > previousFrameTime || viewportIsScrolling == true))
    {
        var t0 = new Date();
        var obj = viewableMap.selectObject(mouseX, mouseY);
        
        if (obj)
        {
            setSelection(obj);
            redrawObject(obj);
            redrawMap(false, true);
            
            var t2 = new Date();
            var msg = 'Selection time: '+(t2-t0) +' ms';
            $('#selection_time')[0].innerHTML = msg;
        }
    }
    
    if (viewportIsScrolling == true) redrawMap(true, false);
    
    if (bufferDirty == true)
    {
        canvasContext.clearRect(0,0,viewWidth, viewHeight);
        canvasContext.drawImage(buffer, 0, 0);
        bufferDirty = false;
    }
    
    previousFrameTime = new Date();
}
