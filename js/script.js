// Animation variables
var interval = null;
var tickerInterval = null;
var animationOn = false;
var previousFrameTime = 0;

// Map
var map = null;
var viewX = 0, viewY = 0;
var bufferWidth = 0;
var bufferHeight = 0;
var halfViewWidth = 0;
var halfViewHeight = 0;
var redrawFlags = 0; // Serious business

// Sprite selection
var focussed = null;
var allowSelection = true;
var mouseX = 0, mouseY = 0;
var extendedSelection = [];

// Viewport Scrolling
var viewportScrollLeft = false;
var viewportScrollUp = false;
var horizontalScrollSpeed = 0;
var verticalScrollSpeed = 0;

// Mouse movement event handling
var previousMouseMove = new Date();
var mouseInside = false;

// Keyboard event handling
var previousKeyboardEvent = new Date();

var fpsVal = FPS;

window.onload = init;

var kirby = null;

function init()
{
    // Get the canvas element to display the game in.
    canvas = document.getElementById('display');
    viewWidth = canvas.width;
    viewHeight = canvas.height;
    bufferHeight = viewHeight << 1;
    bufferWidth = viewWidth << 1;
    halfViewHeight = viewHeight >> 1;
    halfViewWidth = viewWidth >> 1;
    
    // TODO: put this somewhere else
    // Adjust ticker height based on type size setting
    $('#msg')[0].height = msgTypeSize + (msgBorder << 1);
    
    // Get graphics contexts for the canvas elements
    canvasContext = canvas.getContext("2d");
    // Do the following so we don't have to clearrect each time we copy
    // from the buffer
    canvasContext.globalCompositeOperation = "copy";
    
    // set this for the fps counter
    canvasContext.font = "bold 14px sans-serif";
    
    // Create a buffer to draw to and initialize it
    buffer = $('<canvas>')[0];
    buffer.height = bufferHeight;
    buffer.width = bufferWidth;
    
    // Get the context
    bufferCtx = buffer.getContext("2d");
    bufferCtx.strokeStyle = "black";
    
    // Init forground, ticker, and background canvases
    setBackgroundLinearVerticalGradient();
    setOverlayWhiteVerticalGradient();
    setMessage("Welcome to the JSRPG map editor!");
    
    // Initialize the tiles based on the map
    var t0 = new Date();
    initGraphics();
    var t1 = new Date();
    log("Graphics init: " + (t1-t0) + " ms");
    
    // generate terrain
    generateTestMap();
            
    //Initialize the buffer
    map.optimize();
    t0 = new Date();
    map.markBufferCollision();
    map.updateBuffer(false, bufferX, bufferY, bufferWidth, bufferHeight);
    t1 = new Date();
    redrawFlags = 0xFFFFFFFF;
    viewportDirty = true;
    
    msg = "Buffer initial draw time: "+ (t1-t0) +"ms";
    msg += " (" + bufferWidth + " by " + bufferHeight + " pixels)";
    log(msg);
    
    // Bind event handlers
    configureEventBindings();
    
    // set up editor
    tileEditorInit();
    
    // Set initial selection (note: this needs to be done after editor init)
    setSelection(map.data[0]);
    
    // Start drawing
    toggleAnimation();
    
    // Initialize the interface
    ui = new Interface(document.getElementById('interface'));
    charWin = new InterfaceWindow("test win", 20, viewHeight - 115, 300, 101);
    var lb = new InterfaceLabel("name label", charWin, "Kirby!", 100,5);
    var pbar = new ProgressBar("test", charWin, 100,32,100,5,0,0,0);
    var lb = new InterfaceLabel("t label", charWin, "HP:^2 10/10", 100,19);
    var port = new ImageWell("portrait", charWin, kirbyPortrait, 5, 5);
    
    // Make a character
    kirby = new GameObject("kirby", kirbyAnimations);
    kirby.setTile(map.data[205]);
    kirby.moveForward(true);
}

function configureEventBindings()
{
    // Set up mouse move event listener
    $('#game').bind('mouseenter focusin', function() {
        mouseInside = true;
        $('#game').bind('mousemove', mouseMoveHandler);
        
    });
    
    $('#game').bind('mouseleave focusout', function() {
        mouseInside = false;
        
        // Fire mousemove with mouseInside = false to stop scrolling
        $('#game').trigger('mousemove');
        
        // This doesn't happen sometimes, and it's annoying.
        horizontalScrollSpeed = 0;
        verticalScrollSpeed = 0;
        
        $('#game').unbind('mousemove');
    });
    
    // Set up click handlers
    $(window).bind('mousedown mouseup', mouseClickHandler);
        
    // handle ericb mode
    $('#ebmode').bind('click', ericBHandler);
    
    // Click-to-select mode
    $('#clk').bind('click', function () {
        clickToSelect = clickToSelect ? false : true;
    });
    
    // enable/disable scrolling
    $('#allow-scroll').bind('click', function ()
        {allowScrolling = allowScrolling ? false : true;});
    
    // enable/disable scrolling by mousing over border
    $('#b-scrolling').bind('click', function ()
        {allowBorderScroll = allowBorderScroll ? false : true;});
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
    if (object == null)
        return false;
    
    if (focussed === object)
        return false;
    
    // Deselect the previously focussed object
    if (focussed != null)
    {
        focussed.removeShader(primarySelection);
        map.updateBuffer(true, focussed.px, focussed.py, tileGraphicWidth, focussed.h);
        
        // Notify all associated objects that they've had focus removed.
        if (focussed.obj != null)
        {
            var list = focussed.obj;
            for (var i = list.length - 1; i >= 0; i--)
                list[i].lostFocus();
        }
    }
    
    // Select object
    object.selected = true;
    focussed = object;
    focussed.addShader(true, primarySelection);
    
    // If we're trying to keep selection in view, figure out if it left
    var delta = false;
    if (cameraFollowsSelection == true && keepInViewport == true)
    {
        if (object.px < viewX + scrollBorder)
        {
            viewX = object.px - scrollBorder;
            delta = true;
        } else if (object.px + tileGraphicWidth > viewX + viewWidth - scrollBorder) {
            viewX = (object.px + tileGraphicWidth + scrollBorder) - viewWidth;
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
    
    // Move map if delta == true
    if (delta == true)
    {
        if (viewX < bufferX || viewX + viewWidth > bufferX + bufferWidth ||
            viewY < bufferY || viewY + viewHeight > bufferY + bufferHeight )
                moveBuffer(viewX - (viewWidth >> 1), viewY - (viewHeight >> 1));
        
        // redraw tile but do NOT update viewport
        map.updateBuffer(false, focussed.px, focussed.py, tileGraphicWidth, focussed.h);
        
        viewportDirty = true;
    } else {
        // redraw only selected tile and update viewport
        map.updateBuffer(true, focussed.px, focussed.py, tileGraphicWidth, focussed.h);
    }
    
    // Update the tile editor
    tileEditorUpdate();
    
    // Notify all associated objects that they've recieved focus.
    if (focussed.obj != null)
    {
        var list = focussed.obj;
        for (var i = list.length - 1; i >= 0; i--)
            list[i].gotFocus();
    }
    
    return true;
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
    obj.addShader(false, secondarySelection);
    map.updateBuffer(false, obj.px, obj.py, tileGraphicWidth, obj.h);
    
    // Return its index
    return extendedSelection.length - 1;
}

function clearExtendedSelection()
{
    var obj = null;
    for (var i = 0; i < extendedSelection.length; i++)
    {
        obj = extendedSelection[i];
        obj.removeShader(secondarySelection);
        map.updateBuffer(true, obj.px, obj.py, tileGraphicWidth, obj.h);
    }
    
    delete extendedSelection;
    extendedSelection = [];
}

function insertAboveExtendedSelection()
{
    if (extendedSelection.length == 0)
        return;
    
    var newSelection = [];
    
    var tmp = null;
    var obj = null;
    for (var i = 0; i < extendedSelection.length; i++)
    {
        obj = extendedSelection[i];
        obj.removeShader(secondarySelection);
        tmp = map.insertAboveObject(obj, obj.terrain);
        if (tmp != null)
        {
            newSelection[i] = tmp;
            tmp.addShader(false, secondarySelection);
            map.updateBuffer(true, obj.px, obj.py - obj.h, tileGraphicWidth, obj.h * 2);
        } else {
            map.updateBuffer(true, obj.px, obj.py, tileGraphicWidth, obj.h);
        }
    }
    
    delete extendedSelection;
    extendedSelection = newSelection;
}

function deleteExtendedSelection()
{
    if (extendedSelection.length == 0)
        return false;
    
    for (var i = 0; i < extendedSelection.length; i++)
    {
        if (extendedSelection[i] === focussed)
            deleteFocussed();
        else
            map.deleteObject(extendedSelection[i]);
    }
    
    var newSelection = [];
    var newObj = null;
    for (var i = 0; i < extendedSelection.length; i++)
    {
        newObj = map.snap(extendedSelection[i].x, extendedSelection[i].y,
            extendedSelection[i].z, false);
        
        if (newObj != null)
        {
            newSelection.push(newObj);
            newObj.secondary_selection = true;
        }
    }
    
    for (var i = 0; i < extendedSelection.length; i++)
        map.updateBuffer(true, extendedSelection[i].px,
            extendedSelection[i].py - extendedSelection[i].h,
            tileGraphicWidth, extendedSelection[i].h * 2);
    
    delete extendedSelection;
    extendedSelection = newSelection;
    
    return true;
}

function deleteFocussed()
{
    if (focussed == null) return false;
    
    var old = map.deleteObject(focussed);
    map.updateBuffer(true, old.px, old.py, tileGraphicWidth, old.h);
    focussed = null;
    
    // Move selection down
    obj = map.fall(old.x, old.y, old.z);
    if (obj == null) obj = map.snap(old.x, old.y, old.z, false);
    if (obj != null) setSelection(obj, true);
    
    tileEditorUpdate();
    
    return true;
}

function mouseClickHandler(ev)
{
    if (focussed == null)
        return true;
    else if (ev.type === 'mousedown')
        ev.preventDefault();
    else if (ev.type === 'mouseup')
        return true; // for now
    
    if (mouseInside == false)
        return true;
    
    var obj = null;
    if (clickToSelect == true )
    {
        obj = map.selectObject(mouseX + viewX, mouseY + viewY);;
        if (obj == null) return true;
        
        if (ev.shiftKey)
        {
            if (obj === focussed)
            {
                deleteFocussed();
            } else {
                map.deleteObject(obj);
                map.updateBuffer(true, obj.px, obj.py, tileGraphicWidth, obj.h);
            }
        } else {
            setSelection(obj, false);
            
            var t = kirby.tile;
            if (kirby.target_tile != null)
                t = kirby.target_tile;
            
            var res = optimalPath(t, obj, 30, 5);
            if (res.r == null) return false;
            
            var r = res.r, ret = [];
            while (r != null)
            {
                ret.push(r.obj);
                r = r.prev;
            }
            
            var start = kirby.path == null ? true : false;
            if (start == false)
                kirby.cancelMovementPath();
            
            kirby.startMovingOnPath(ret, start);
            
        }
    } else {
        if (ev.shiftKey)
        {
            deleteFocussed();
        } else {
            obj = map.insertAboveObject(focussed, focussed.terrain);
            if (obj != null )
                map.updateBuffer(true, obj.px, obj.py, tileGraphicWidth, obj.h);
        }
    }
    
    return false;
}

function mouseMoveHandler(evt)
{
    var time = new Date();
    if (time - previousMouseMove < mouseMoveDelay)
        return false;
    
    mouseX = evt.pageX - canvas.offsetLeft;
    mouseY = evt.pageY - canvas.offsetTop;
    
    // Check to see if the mouse has entered the scroll border
    if (allowScrolling == true && mouseInside == true &&
        allowBorderScroll == true)
    {
        if (mouseX < scrollBorder)
        {
            // left
            horizontalScrollSpeed = mouseScrollGranulatiry;
            viewportScrollLeft = true;
        } else if (mouseX > viewWidth - scrollBorder) {
            // right
            horizontalScrollSpeed = mouseScrollGranulatiry;
            viewportScrollLeft = false;
        } else {
            horizontalScrollSpeed = 0;
        }
        
        if (mouseY < scrollBorder)
        {
            // up
            verticalScrollSpeed = mouseScrollGranulatiry;
            viewportScrollUp = true;
        } else if (mouseY > viewHeight - scrollBorder) {
            // down
            verticalScrollSpeed = mouseScrollGranulatiry;
            viewportScrollUp = false;
        } else {
            verticalScrollSpeed = 0;
        }
    } else {
        horizontalScrollSpeed = 0;
        verticalScrollSpeed = 0;
    }
    
    // N.B.: The following is for performance.  I have found that with the
    // current redraw implementation, selecting an object WHILE scrolling
    // starts to put too much stress on the browser.  So for now, its off.
    if (horizontalScrollSpeed == 0 && verticalScrollSpeed == 0 &&
        clickToSelect == false)
    {
        var obj = map.selectObject(mouseX + viewX, mouseY + viewY);
        
        if (obj != null)
        {
            setSelection(obj);
            tileEditorUpdate();
        }
    }
    
    previousMouseMove = new Date();
    return false;
}

function setRandomTickerMessage()
{
    var i = Math.floor(Math.random() * (tickerMessages.length));
    setMessage(tickerMessages[i]);
}

function toggleAnimation()
{
    if (animationOn == true)
    {
        clearInterval(interval);
        clearInterval(tickerInterval);
        clearInterval(spriteAnimationInterval);
        interval = null;
        animationOn = false;
    } else {
        tickerInterval = setInterval( function() {
            setRandomTickerMessage();
        },1000 * tickerChangeRate);
        spriteAnimationInterval = setInterval(animate, 1000 / FPS);
        interval = setInterval(draw, 1000 / FPS);
        animationOn = true;
    }
}

function draw()
{
    var delta = false;
    var above = false;
    var below = false;
    var left = false;
    var right = false;
    
    if (horizontalScrollSpeed > 0)
    {
        if (viewportScrollLeft == true)
        {
            viewX -= horizontalScrollSpeed;
            if (viewX-bufferX < halfViewWidth)
                left = true;
        } else {
            viewX += horizontalScrollSpeed;
            if (viewX - bufferX + viewWidth > bufferWidth - halfViewWidth)
                right = true;
        }
        
        delta = true;
    } else {
        if (viewX - bufferX < halfViewWidth)
            left = true;
        else if (viewX - bufferX + viewWidth > bufferWidth - halfViewWidth)
            right = true;
    }
    
    if (verticalScrollSpeed > 0)
    {
        if (viewportScrollUp == true)
        {
            viewY -= verticalScrollSpeed;
            if (viewY - bufferY < halfViewHeight)
                above = true;
        } else { 
            viewY += verticalScrollSpeed;
            if (viewY - bufferY + viewHeight > bufferHeight - halfViewHeight)
                below = true;
        }
        
        delta = true;
    } else {
        if (viewY - bufferY < halfViewHeight)
            above = true;
        else if (viewY - bufferY + viewHeight > bufferHeight - halfViewHeight)
            below = true;
    }
    
    if (delta == true || viewportDirty == true)
    {
        var direction = 0;
        
        // Check map bounds
        if (viewX < bufferX || viewY + viewHeight > bufferY + bufferHeight)
            direction = 2;
        else if (viewY < bufferY || viewX + viewWidth > bufferX + bufferWidth)
            direction = 1;
        
        if (direction != 0)
        {
            bufferX = viewX - halfViewWidth;
            bufferY = viewY - halfViewHeight;
            map.markBufferCollision(direction);
            map.updateBuffer(false, bufferX + halfViewWidth,
                bufferY + halfViewHeight, viewWidth, viewHeight, true);
            
            // reset sections
            redrawFlags = 0;
            
        } else if (redrawFlags != 255) {
            // The following is some long, but necessary, logic to detect
            // which portion of the buffer the viewport has moved in to and
            // redraw that portion only.  In practice this greatly increases
            // the smoothness of panning across a large.
            
            if (left == true)
            {
                if ((redrawFlags & 8) == 0)
                {
                    map.updateBuffer(false, bufferX, bufferY +
                        halfViewHeight, halfViewWidth, viewHeight);
                    redrawFlags |= 8;
                }
                if (above == true)
                {
                    if ((redrawFlags & 2) > 0)
                    {
                        if ((redrawFlags & 1) == 0)
                        {
                            map.updateBuffer(false, bufferX, bufferY,
                                halfViewWidth, halfViewHeight);
                            redrawFlags |= 1;
                        }
                    } else {
                        map.updateBuffer(false, bufferX, bufferY,
                            bufferWidth - halfViewWidth, halfViewHeight);
                        redrawFlags |= 3;
                    }
                } else if (below == true) {
                    if ((redrawFlags & 64) > 0)
                    {
                        if ((redrawFlags & 32) == 0)
                        {
                            map.updateBuffer(false, bufferX,
                                bufferY + bufferHeight - halfViewHeight,
                                halfViewWidth,halfViewHeight);
                            redrawFlags |= 32;
                        }
                    } else {
                        map.updateBuffer(false, bufferX,
                            bufferY + bufferHeight - halfViewHeight,
                            bufferWidth - halfViewWidth, halfViewHeight);
                        redrawFlags |= 96;
                    }
                }
            } else if (right == true) {
                if ((redrawFlags & 16) == 0)
                {
                    map.updateBuffer(false,
                        bufferX + bufferWidth - halfViewWidth, bufferY +
                        halfViewHeight, halfViewWidth, viewHeight);
                    redrawFlags |= 16;
                }
                if (above == true)
                {
                    if ((redrawFlags & 2) > 0)
                    {
                        if ((redrawFlags & 4) == 0)
                        {
                            map.updateBuffer(false,
                                bufferX + bufferWidth - halfViewWidth,
                                bufferY, halfViewWidth, halfViewHeight);
                            redrawFlags |= 4;
                        }
                    } else {
                        map.updateBuffer(false, bufferX + halfViewWidth,
                            bufferY,bufferWidth - halfViewWidth, halfViewHeight);
                        redrawFlags |= 6;
                    }
                } else if (below == true) {
                    if ((redrawFlags & 64) > 0)
                    {
                        if ((redrawFlags & 128) == 0)
                        {
                            map.updateBuffer(false,
                                bufferX + bufferWidth - halfViewWidth,
                                bufferY + bufferHeight - halfViewHeight,
                                halfViewWidth, halfViewHeight);
                            redrawFlags |= 128;
                        }
                    } else {
                        map.updateBuffer(false, bufferX + halfViewWidth,
                            bufferY + bufferHeight - halfViewHeight,
                            bufferWidth - halfViewWidth, halfViewHeight);
                        redrawFlags |= 192;
                    }
                }
            } else if (above == true) {
                if ((redrawFlags & 2) == 0)
                {
                    map.updateBuffer(false, bufferX + halfViewWidth, bufferY,
                        viewWidth,halfViewHeight);
                    redrawFlags |= 2;
                }
            } else if (below == true) {
                if ((redrawFlags & 64) == 0)
                {
                    map.updateBuffer(false, bufferX + halfViewWidth,
                        bufferY + bufferHeight - halfViewHeight,
                        viewWidth, halfViewHeight);
                    redrawFlags |= 64;
                }
            }
        }
        
        canvasContext.drawImage(buffer, viewX - bufferX, viewY - bufferY,
            viewWidth,viewHeight,0,0,viewWidth,viewHeight);
        
        viewportDirty = false;
    } else if (redrawFlags != 255) {
        // draw the entire buffer
        bufferX = viewX - halfViewWidth;
        bufferY = viewY - halfViewHeight;
        map.markBufferCollision(direction);
        map.updateBuffer(false, bufferX, bufferY, bufferWidth, bufferHeight, true);
        
        // mark everything as drawn
        redrawFlags = 255;
    }
    
    // TODO: Make this report some sort of reasonable "FPS"
    /*
    if (fpsCounter && mouseInside == true)
    {
        var nt = new Date();
        canvasContext.fillStyle = "black";
        canvasContext.fillRect(5, viewHeight - 20, 60, 50);
        canvasContext.fillStyle = "white";
        //fpsVal = Math.ceil(fpsVal * 0.9 + previousFrameTime*0.1);
        canvasContext.fillText("FPS: " + (nt - previousFrameTime), 10, viewHeight - 4);
        previousFrameTime = nt;
    } else {
        previousFrameTime = new Date();
    }
    */
}
