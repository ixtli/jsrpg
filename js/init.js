// Map
var gameState = {
    paused: false,
    tickerChangeRate: 10,
    ticker: null,
};

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
var extendedSelection = [];

// Viewport Scrolling
var viewportScrollLeft = false;
var viewportScrollUp = false;
var horizontalScrollSpeed = 0;
var verticalScrollSpeed = 0;

var kirby = null;

window.onload = init;

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
    
    // Init user data
    udata = new UserData();
    
    // Init ticker
    gameState.ticker = new Ticker($('#msg')[0]);
    gameState.ticker.setMessage("Welcome to the JSRPG map editor!");
    
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
    overlay = new Overlay($('#fg')[0]);
    background = new Background($('#bg')[0]);
    background.linearVerticalGradient();
    overlay.whiteVerticalGradient();
    
    // Intialize input manager
    inputManager = new InputManager();
    
    // Initialize animation manager and register animations
    animationManager = new AnimationManager(false);
    animationManager.registerAnimation("ticker",
        function() {setRandomTickerMessage();}, 1000 * gameState.tickerChangeRate);
    animationManager.registerAnimation("sprites", animate,
        1000 / constants.fps);
    animationManager.registerAnimation("scroll", draw, 1000 / constants.fps);
    animationManager.registerAnimation("objects", animate, 1);
    animationManager.registerAnimation("movement", move, 1000 / constants.fps);
    
    // Initialize the tiles based on the map
    var t0 = new Date();
    initGraphics();
    var t1 = new Date();
    log("Graphics init: " + (t1-t0) + " ms");
    
    // generate terrain
    generateTestMap();
    
    //Initialize the buffer
    map.updateBuffer(false, bufferX, bufferY, bufferWidth, bufferHeight);
    redrawFlags = 0xFFFFFFFF;
    viewportDirty = true;
    
    // set up editor
    tileEditorInit();
    
    // Set initial selection (note: this needs to be done after editor init)
    setSelection(map.data[0]);
    
    // Start drawing
    animationManager.startAnimation("ticker");
    animationManager.startAnimation("sprites");
    animationManager.startAnimation("scroll");
    
    // Start accepting input
    inputManager.enableAllInput();
    inputManager.bindWindowFocusHandlers();
    
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
    
    return true;
}

function bootstrapKirbyAnimations()
{
    var tmp = new SpriteSheet(kirbyImage, "Kirby",
        kirbySheetWidth, kirbySheetHeight, characterSprites);
    
    kirbyAnimations['moving'] = new Array(4);
    kirbyAnimations['moving'][DIR_CLOSER] = new Animation(
        characterSprites, 9, 3, true, kirbyWalkingSpeed);
    kirbyAnimations['moving'][DIR_FURTHER] = new Animation(
        characterSprites, 6, 3, true, kirbyWalkingSpeed);
    kirbyAnimations['moving'][DIR_LEFT] = new Animation(
        characterSprites, 3, 3, true, kirbyWalkingSpeed);
    kirbyAnimations['moving'][DIR_RIGHT] = new Animation(
        characterSprites, 0, 3, true, kirbyWalkingSpeed);
    
    kirbyAnimations['idle'] = new Array(4);
    kirbyAnimations['idle'][DIR_CLOSER] = new Animation(
        characterSprites, 9, 3, true, kirbyWalkingSpeed);
    kirbyAnimations['idle'][DIR_FURTHER] = new Animation(
        characterSprites, 6, 3, true, kirbyWalkingSpeed);
    kirbyAnimations['idle'][DIR_LEFT] = new Animation(
        characterSprites, 3, 3, true, kirbyWalkingSpeed);
    kirbyAnimations['idle'][DIR_RIGHT] = new Animation(
        characterSprites, 0, 3, true, kirbyWalkingSpeed);
}

function pause()
{
    if (gameState.paused == true) return false;
    
    gameState.paused = true;
    animationManager.suspendAll();
    overlay.clear();
    overlay.greyTranslucent();
    gameState.ticker.setMessage(
        "Pause automatically when the window loses focus.");
    
    return true;
}

function unpause()
{
    if (gameState.paused == false) return false;
    
    gameState.paused = false;
    animationManager.resumeAll();
    overlay.clear();
    overlay.whiteVerticalGradient();
    setRandomTickerMessage();
    return true;
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
    if (constants.cameraFollowsSelection == true && keepInViewport == true)
    {
        if (object.px < viewX + inputSettings.scrollBorder)
        {
            viewX = object.px - inputSettings.scrollBorder;
            delta = true;
        } else if (object.px + tileGraphicWidth > viewX + viewWidth - inputSettings.scrollBorder) {
            viewX = (object.px + tileGraphicWidth + inputSettings.scrollBorder) - viewWidth;
            delta = true;
        }
        
        if (object.py < viewY + inputSettings.scrollBorder)
        {
            viewY = object.py - inputSettings.scrollBorder;
            delta = true;
        } else if (object.py + object.h > viewY + viewHeight - inputSettings.scrollBorder){
            viewY = (object.py + object.h + inputSettings.scrollBorder) - viewHeight;
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

function setRandomTickerMessage()
{
    var i = Math.floor(Math.random() * (tickerMessages.length));
    gameState.ticker.setMessage(tickerMessages[i]);
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
}
