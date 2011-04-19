var inputManager = null;

function InputManager()
{
    // Mouse movement event handling
    this.mouseX = 0;
    this.mouseY = 0;
    this.previousMouseMove = new Date();
    this.mouseInside = false;
    
    // Keyboard event handling
    this.previousKeyboardEvent = new Date();
    
    // List of all html elements that are not canvases
    this.htmlElements = ['#ebmode', '#clk', '#allow-scroll', '#b-scrolling'];
    
    return this.init();
}

InputManager.prototype = {
    
    init: function ()
    {
        
        return true;
    },
    
    unbindViewInteraction: function ()
    {
        $('#game').unbind('mouseenter focusin mouseleave focusout');
        $('#game').unbind('mousemove mousedown mouseup');
        $(window).keydown(null);
        
        return true;
    },
    
    bindViewInteraction: function ()
    {
        // These methods refer specifically to the global variable defined at
        // the top of this file (input) because of an ECMAScript bug wherein
        // the caller of the bound functions will incorrectly set the 'this'
        // variable.  Thus, we can't assume that this.mouseInside will be set
        // correctly, for example.
        
        // Set up mouse move event listener
        $('#game').bind('mouseenter focusin', function() {
            inputManager.mouseInside = true;
            $('#game').bind('mousemove', inputManager.mouseMoveHandler);
        });
        
        $('#game').bind('mouseleave focusout', function() {
            inputManager.mouseInside = false;
            
            // Fire mousemove with mouseInside = false to stop scrolling
            $('#game').trigger('mousemove');
            
            // This doesn't happen sometimes, and it's annoying.
            horizontalScrollSpeed = 0;
            verticalScrollSpeed = 0;
            
            $('#game').unbind('mousemove');
        });
        
        // Set up click handlers
        $('#game').bind('mousedown mouseup', inputManager.mouseClickHandler);
        
        $(window).keydown(inputManager.keydownHandler);
        
        return true;
    },
    
    unbindExternalInteraction: function ()
    {
        $('#ebmode').unbind('click');
        $('#clk').unbind('click');
        $('#allow-scroll').unbind('click');
        $('#b-scrolling').unbind('click');
        
        return true;
    },
    
    bindExternalInteraction: function ()
    {
        // handle ericb mode
        $('#ebmode').bind('click', inputManager.ericBHandler);
        
        // Click-to-select mode
        $('#clk').bind('click', function () {
            inputSettings.clickToSelect = inputSettings.clickToSelect ?
                false : true;
        });
        
        // enable/disable scrolling
        $('#allow-scroll').bind('click', function () {
            inputSettings.allowScrolling = inputSettings.allowScrolling ?
                false : true;
        });
        
        // enable/disable scrolling by mousing over border
        $('#b-scrolling').bind('click', function () {
            inputSettings.allowBorderScroll = inputSettings.allowBorderScroll ?
                false : true;
        });
        
        return true;
    },
    
    mouseMoveHandler: function (evt)
    {
        var time = new Date();
        if (time - inputManager.previousMouseMove <
            inputSettings.mouseMoveDelay)
            return false;
        
        var x = evt.pageX - canvas.offsetLeft;
        var y = evt.pageY - canvas.offsetTop;
        
        // Sometimes safari returns "undefined" for pageX and pageY
        if (isNaN(x + y) == true) return false;
        
        // Check to see if the mouse has entered the scroll border
        if (inputSettings.allowScrolling == true &&
            inputSettings.allowBorderScroll == true &&
            inputManager.mouseInside == true)
        {
            if (x < inputSettings.scrollBorder)
            {
                // left
                horizontalScrollSpeed = inputSettings.mouseScrollGranulatiry;
                viewportScrollLeft = true;
            } else if (x > viewWidth - inputSettings.scrollBorder) {
                // right
                horizontalScrollSpeed = inputSettings.mouseScrollGranulatiry;
                viewportScrollLeft = false;
            } else {
                horizontalScrollSpeed = 0;
            }
            
            if (y < inputSettings.scrollBorder)
            {
                // up
                verticalScrollSpeed = inputSettings.mouseScrollGranulatiry;
                viewportScrollUp = true;
            } else if (y > viewHeight - inputSettings.scrollBorder) {
                // down
                verticalScrollSpeed = inputSettings.mouseScrollGranulatiry;
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
        // starts to put too much stress on the browser.  So for now: it's off.
        if (horizontalScrollSpeed == 0 && verticalScrollSpeed == 0 &&
            inputSettings.clickToSelect == false)
        {
            var obj = map.selectObject(inputManager.mouseX + viewX,
                inputManager.mouseY + viewY);
            
            if (obj != null)
            {
                setSelection(obj);
                tileEditorUpdate();
            }
        }
        
        inputManager.mouseX = x;
        inputManager.mouseY = y;
        inputManager.previousMouseMove = new Date();
        
        return false;
    },
    
    mouseClickHandler: function (evt)
    {
        if (focussed == null)
            return true;
        else if (evt.type === 'mousedown')
            evt.preventDefault();
        else if (evt.type === 'mouseup')
            return true; // for now
        
        if (inputManager.mouseInside == false)
            return true;
        
        var obj = null;
        if (inputSettings.clickToSelect == true )
        {
            obj = map.selectObject(inputManager.mouseX + viewX,
                inputManager.mouseY + viewY);
            if (obj == null) return true;
            
            if (evt.shiftKey)
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
            if (evt.shiftKey)
            {
                deleteFocussed();
            } else {
                obj = map.insertAboveObject(focussed, focussed.terrain);
                
                if (obj != null )
                {
                    map.updateBuffer(true, obj.px, obj.py,
                        tileGraphicWidth, obj.h);
                }
            }
        }
        
        return false;
    },
    
    keydownHandler: function (evt)
    {
        var time = new Date();
        if (time - inputManager.previousKeyboardEvent < inputSettings.keyRepeatDelay)
            return;
        
        var code = evt.keyCode ? evt.keyCode : evt.which;
        
        // Ignore when the user intially presses the shift key: we only care
        // if it's down when something else happens.  If we don't return false
        // safari sends a mousemove event which screws up selection.  Weird.
        if (code === 16) return true;
        
        // walk our keys to see which action we want
        // utilizing arrays in an object allows us to respond to more than one
        var action;
        $.each(keys,function(act, mappedKeys) {
            $.each(mappedKeys, function(index, keyCode) {
                if (code == keyCode) {
                    action = act;
                    return false; // found it
                }
                return true; // next code
            });
            if (action == act) return false; // found it
            else return true; // next key
        });
        
        switch (action)
        {
        case "move_left":
        case "move_up":
        case "move_down":
        case "move_right":
            if (focussed != null)
            {
                // Handle selecting multiple objects
                if (evt.shiftKey)
                    addToExtendedSelection(focussed);
                else if (extendedSelection.length > 0)
                    clearExtendedSelection();
                
                var found = getSibling(focussed,
                                       action.replace("move_","").
                                       replace("up","further").
                                       replace("down","closer"));
                if (found != null)
                    setSelection(found, true);
            }
            break;
            
        case "scroll_left":
        case "scroll_up":
        case "scroll_down":
        case "scroll_right":
            if (inputSettings.allowScrolling == false) break;
            scrollViewport(action.replace("scroll_",""));
            break;
            
        case "subtract":
            if (extendedSelection.length > 0)
            {
                deleteExtendedSelection();
            } else if (focussed != null) {
                deleteFocussed();
            }
            break;
            
        case "add":
            // handle multiple selections
            if (extendedSelection.length > 0)
            {
                insertAboveExtendedSelection();
            } else if (focussed != null) {
                obj = map.insertAboveObject(focussed, focussed.terrain);
                if (obj)
                    setSelection(obj, true);
            }
            break;
            
        case "refresh":
            delete map;
            map = new DepthSortedArray(0);
            
            // generate terrain
            generateTestMap();
            
            focussed = null;
            map.buffer = bufferCtx;
            
            map.optimize();
            map.markBufferCollision();
            map.updateBuffer(false, bufferX, bufferY, bufferWidth, bufferHeight);
            viewportDirty = true;
            
            canvasContext.drawImage(buffer, viewX - bufferX, viewY - bufferY,
                                    viewWidth,viewHeight,0,0,viewWidth,viewHeight);
            
            // reset sections
            redrawFlags = 0;
            break;
            
        case "optimize":
            map.optimize();
            break;
            
        default:
            log("Unhandled keycode: " + code);
            return true;
            break;
        }
        
        return false;
    },
    
    ericBHandler: function ()
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
    },
    
    enableAllInput: function ()
    {
        this.bindViewInteraction();
        this.bindExternalInteraction();
        
        return true;
    },
    
    disableAllInput: function ()
    {
        this.unbindViewInteraction();
        this.unbindExternalInteraction();
        
        return true;
    },
    
};
