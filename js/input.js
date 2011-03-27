$(window).keydown(
    function(evt) {
        var time = new Date();
        if (time - previousKeyboardEvent < keyRepeatDelay)
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
    });

