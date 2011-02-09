// Animation variables
var interval = null;
var tickerInterval = null;
var animationOn = false;
var previousFrameTime = 0;

// Map
var map = null;
var viewX = 0, viewY = 0;

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
var keyMap = {up: key_w, down: key_s, left: key_a, right: key_d};

var fpsVal = FPS;

window.onload = init;

function init()
{
    // Get the canvas element to display the game in.
    canvas = document.getElementById('display');
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    
    // TODO: put this somewhere else
    // Adjust ticker height based on type size setting
    $('#msg')[0].height = msgTypeSize + (msgBorder << 1);
    
    // Get graphics contexts for the canvas elements
    canvasContext = canvas.getContext("2d");
    // Do the following so we don't have to clearrect each time we copy
    // from the buffer
    // canvasContext.globalCompositeOperation = "copy";
    
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
    initTiles();
    var t1 = new Date();
    log("Tilegen: "+(t1-t0)+" ms");
    
    map = new DepthSortedArray(0);
    
    // generate terrain
    t0 = new Date();
    generateTestMap();
    t1 = new Date();
    
    // Associate the buffer context with the map DSA
    map.buffer = bufferCtx;
    
    // Configure the buffer
    bufferX = viewX;
    bufferY = viewY;
    
    //Initialize the buffer
    map.optimize();
    map.markBufferCollision();
    map.updateBuffer(false, bufferX, bufferY, bufferWidth, bufferHeight, true);
    viewportDirty = true;
    
    var msg = "Terrain DSA insertion time: "+ (t1-t0) +"ms"
    msg += " (" + map.data.length + " tiles)";
    log(msg);
    
    // Bind event handlers
    configureEventBindings();
    
    // set up editor
    tileEditorInit();
    
    // Set initial selection (note: this needs to be done after editor init)
    setSelection(map.data[0]);
    
    // Start drawing
    toggleAnimation();
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
    
    // Set up keyboard handlers
    // @TODO handle keyup with this too
    $(window).bind('keydown', keypressHandler);
    
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
        focussed.selected = false;
        map.updateBuffer(true, focussed.px, focussed.py, focussed.w, focussed.h);
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
    
    // Move map if delta == true
    if (delta == true)
    {
        if (viewX < bufferX || viewX + viewWidth > bufferX + bufferWidth ||
            viewY < bufferY || viewY + viewHeight > bufferY + bufferHeight )
                moveBuffer(viewX - (viewWidth >> 1), viewY - (viewHeight >> 1));
        
        // redraw tile but do NOT update viewport
        map.updateBuffer(false, focussed.px, focussed.py, focussed.w, focussed.h);
        
        viewportDirty = true;
    } else {
        // redraw only selected tile and update viewport
        map.updateBuffer(true, focussed.px, focussed.py, focussed.w, focussed.h);
    }
    
    // Update the tile editor
    tileEditorUpdate();
    
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
    map.updateBuffer(false, obj.px, obj.py, obj.w, obj.h);
    
    // Return its index
    return extendedSelection.length - 1;
}

function clearExtendedSelection()
{
    var obj = null;
    for (var i = 0; i < extendedSelection.length; i++)
    {
        obj = extendedSelection[i];
        obj.secondary_selection = false;
        map.updateBuffer(true, obj.px, obj.py, obj.w, obj.h);
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
        tmp = map.insertAboveObject(extendedSelection[i],
            extendedSelection[i].tile);
        if (tmp != null)
        {
            obj = extendedSelection[i];
            newSelection[i] = tmp;
            tmp.secondary_selection = true;
            obj.secondary_selection = false;
            
            map.updateBuffer(true, tmp.px, tmp.py, tmp.w, tmp.h);
            map.updateBuffer(true, obj.px, obj.py, obj.w, obj.h);
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
            map.updateBuffer(true, newObj.px, newObj.py, newObj.w, newObj.h);
        }
    }
    
    delete extendedSelection;
    extendedSelection = newSelection;
    
    return true;
}

function deleteFocussed()
{
    if (focussed == null) return false;
    
    var old = map.deleteObject(focussed);
    map.updateBuffer(true, old.px, old.py, old.w, old.h);
    focussed = null;
    
    // Move selection down
    obj = map.fall(old.x, old.y, old.z);
    if (obj == null) obj = map.snap(old.x, old.y, old.z, false);
    if (obj != null) setSelection(obj, true);
    
    tileEditorUpdate();
    
    return true;
}

function keypressHandler(evt)
{
    var time = new Date();
    if (time - previousKeyboardEvent < keyRepeatDelay)
        return;
    
    var code = evt.keyCode ? evt.keyCode : evt.which;
    
    // Ignore when the user intially presses the shift key: we only care
    // if it's down when something else happens.  If we don't return false
    // safari sends a mousemove event which screws up selection.  Weird.
    if (code == key_shift)
        return true;
    
    switch (code)
    {
        case keyMap.left:
        if (allowScrolling == false) break;
        viewX -= keyboardScrollGranulatiry;
        viewportDirty = true;
        break;
        
        case keyMap.up:
        if (allowScrolling == false) break;
        viewY -= keyboardScrollGranulatiry;
        viewportDirty = true;
        break;
        
        case keyMap.down:
        if (allowScrolling == false) break;
        viewY += keyboardScrollGranulatiry;
        viewportDirty = true;
        break;
        
        case keyMap.right:
        if (allowScrolling == false) break;
        viewX += keyboardScrollGranulatiry;
        viewportDirty = true;
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
        } else if (focussed != null) {
            deleteFocussed();
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
                setSelection(obj, true);
        }
        break;
        
        case key_refresh:
        delete map;
        map = new DepthSortedArray(0);
        
        // generate terrain
        t0 = new Date();
        generateTestMap();
        t1 = new Date();
        
        map.buffer = bufferCtx;
        
        // Configure the buffer
        bufferX = viewX;
        bufferY = viewY;
        
        //Initialize the buffer
        map.updateBuffer(true, bufferX, bufferY, bufferWidth, bufferHeight);
        
        var msg = "Terrain DSA insertion time: "+ (t1-t0) +"ms";
        msg += " (" + map.data.length + " tiles)";
        log(msg);
        break;
        
        case key_optimize:
        map.optimize();
        break;
        
        default:
        log("Unhandled keycode: " + code);
        return true;
        break;
    }
    
    return false;
}

function mouseClickHandler(ev)
{
    if (focussed == null)
        return true;
    else if (ev.type === 'mousedown') ev.preventDefault();
    else if (ev.type === 'mouseup') return true; // for now
    
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
                map.updateBuffer(true, obj.px, obj.py, obj.w, obj.h);
            }
        } else {
            setSelection(obj, false);
        }
    } else {
        if (ev.shiftKey)
        {
            deleteFocussed();
        } else {
            obj = map.insertAboveObject(focussed, focussed.tile);
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
        interval = null;
        animationOn = false;
    } else {
        tickerInterval = setInterval( function() {
            setRandomTickerMessage();
        },1000 * tickerChangeRate);
        
        interval = setInterval(draw, 1000 / FPS);
        animationOn = true;
    }
}

function draw()
{
    var delta = false;
    
    if (horizontalScrollSpeed > 0)
    {
        if (viewportScrollLeft == true)
            viewX -= horizontalScrollSpeed;
        else
            viewX += horizontalScrollSpeed;
        
        delta = true;
    }
    
    if (verticalScrollSpeed > 0)
    {
        if (viewportScrollUp == true)
            viewY -= verticalScrollSpeed;
        else
            viewY += verticalScrollSpeed;
        
        delta = true;
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
            bufferX = viewX - (viewWidth >> 1);
            bufferY = viewY - (viewHeight >> 1);
            map.markBufferCollision(direction);
            map.updateBuffer(false, bufferX, bufferY, bufferWidth, bufferHeight, true);
            canvasContext.drawImage(buffer,0,0);
        }
        
        canvas.style.top = (viewY - bufferY) * -1;
        canvas.style.left = (viewX - bufferX) * -1;
        
        viewportDirty = false;
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
