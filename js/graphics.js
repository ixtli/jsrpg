// Canvas elements
var animationManager = null;
var overlay = null;
var background = null;
var canvas = null;
var buffer = null;

// Drawing
var canvasContext = null;
var bufferCtx = null;
var viewportDirty = false;
var viewWidth = null;
var viewHeight = null;

// buffer image
var bufferX = null;
var bufferY = null;

var lightDistance = 5;

// Sprites
var terrainSprites = [];
var characterSprites = [];
var sheets = [];
var kirbyAnimations = [];

// Animations
var animated = [];
var quantum_alpha = -1;

// Objects currently moving
var moving = [];

function AnimationManager()
{
    this.suspended = false;
    this.animations = [];
    return this.init();
}

AnimationManager.prototype = {
    
    init: function (initialState)
    {
        this.suspended = initialState;
        return true;
    },
    
    registerAnimation: function (name, fxn, quantum)
    {
        if (this.animations[name] != null) return false;
        this.animations[name] = {interval: null, fxn: fxn, quantum: quantum};
        
        return true;
    },
    
    startAnimation: function (name)
    {
        var anim = this.animations[name];
        if (anim == null) return false;
        if (anim.interval != null) return false;
        
        if (this.suspended == true)
            anim.interval = 99999;
        else
            anim.interval = setInterval(anim.fxn, anim.quantum);
        
        return true;
    },
    
    stopAnimation: function (name)
    {
        var anim = this.animations[name];
        if (anim == null) return false;
        if (anim.interval == null) return false;
        
        clearInterval(anim.interval);
        anim.interval = null;
        
        return true;
    },
    
    setQuantum: function (name, quantum)
    {
        var anim = this.animations[name];
        if (anim == null) return false;
        if (anim.quantum == quantum) return true;
        
        if (quantum < 0)
            anim.quantum = 1;
        else
            anim.quantum = quantum;
        
        if (anim.interval != null)
        {
            // restart animation
            this.stopAnimation(name);
            this.startAnimation(name);
        }
        
        return true;
    },
    
    suspendAll: function()
    {
        if (this.suspended == true) return false;
        
        var anim = this.animations;
        var obj = null;
        for (var key in anim)
        {
            obj = anim[key];
            clearInterval(obj.interval);
        }
        
        this.suspended = true;
        return true;
    },
    
    resumeAll: function()
    {
        if (this.suspended == false) return false;
        
        var anim = this.animations;
        var obj = null;
        for (var key in anim)
        {
            obj = anim[key];
            if (obj.interval != null)
                obj.interval = setInterval(obj.fxn, obj.quantum);
        }
        
        this.suspended = false;
        return true;
    },
    
    log: function()
    {
        var a = null;
        
        log("Animation: " + (this.suspended ? "suspended" : "running"));
        
        for (var obj in this.animations)
        {
            a = this.animations[obj];
            log(obj + " (" + a.interval + ") " + a.quantum + "ms");
        }
        
        return true;
    }
    
};

function startMovingObject(object)
{
    if (object == null) return false;
    
    object.speed = Math.round(Math.abs(object.px - object.target_px) /
        (1000 / constants.fps));
    
    moving.push(object);
    
    animationManager.startAnimation('movement');
    
    return true;
}

function move()
{
    var tmp = null;
    var finished = [];
    var cury = 0;
    var done = false;
    
    for (var i = moving.length - 1; i >= 0; i--)
    {
        tmp = moving[i];
        cury = tmp.py;
        done = false;
        
        if (tmp.px < tmp.target_px)
        {
            tmp.px += tmp.speed;
            tmp.py = Math.ceil(
                tmp.slope * (tmp.px - tmp.target_px) + tmp.target_py);
            
            map.updateBuffer(true, tmp.px - tmp.speed, cury,
                tmp.w + tmp.speed, tmp.h + Math.abs(tmp.py - cury));
            
            if (tmp.px >= tmp.target_px) done = true;
        } else {
            tmp.px -= tmp.speed;
            tmp.py = Math.floor(
                tmp.slope * (tmp.px - tmp.target_px) + tmp.target_py);
            
            map.updateBuffer(true, tmp.px, tmp.py,
                tmp.w + tmp.speed, tmp.h + Math.abs(tmp.py - cury));
            
            if (tmp.px <= tmp.target_px) done = true;
        }
        
        if (done == true)
        {
            finished.push(i);
            tmp.finishedMoving();
        }
    }
    
    if (finished.length > 0)
    {
        for (var i = finished.length - 1; i >= 0; i--)
            moving.splice(finished[i], 1);
        
        if (moving.length == 0)
            animationManager.stopAnimation('moving');
    }
}

function Animation(array, start, count, loop, quantum)
{
    this.array = array;
    this.start = start;
    this.count = count;
    this.quantum = quantum;
    this.loop = loop;
    
    // The following is based on the assumption that all sprites in one sheet
    // must have the same dimensions
    this.width = array[start].width;
    this.height = array[start].height;
    
    this.xOffset = 0;
    this.yOffset = 0;
}

function addObjectToBeAnimated(object, fireAnimation)
{
    // O(n) execution time because of loop at the end
    
    if (object == null) return false;
    
    var anim = object.currentAnimation;
    if (anim == null) return false;
    
    if (object.img == null)
        object.img = anim.array[anim.start];
    
    if (quantum_alpha == -1 || anim.quantum < quantum_alpha)
    {
        // We haven't started animating yet
        quantum_alpha = anim.quantum;
        
        animated.splice(0,0, object);
        
        animationManager.setQuantum('objects', quantum_alpha);
        animationManager.startAnimation('objects');
        
        return true;
    }
    
    // Sort by quantum
    var found = false;
    for (var i = 0; i < animated.length; i++)
    {
        if (animated[i].currentAnimation.quantum > anim.quantum)
        {
            animated.splice(i,0,object);
            found = true;
            break;
        }
    }
    
    if (found == false) animated.push(object);
    
    if (fireAnimation == true) animate();
    
    return true;
}

function stopAnimatingObject(object)
{
    // O(n) because of loop to find the thing to stop animating
    
    if (object == null) return false;
    
    var found = -1;
    for (var i = 0; i < animated.length; i++)
    {
        if (object === animated[i])
        {
            animated.splice(i,1);
            found = i;
            break;
        }
    }
    
    if (found == -1) return false;
    
    if (animated.length == 0)
    {
        // Nothing left in the animation stack
        animationManager.stopAnimation("objects");
        quantum_alpha = -1;
        return true;
    }
    
    if (found == 0) {
        // Animation with smallest quantum removed
        quantum_alpha = animated[0].currentAnimation.quantum;
        animationManager.setQuantum('objects', quantum_alpha);
    }
    
    return true;
}

function animate()
{
    var tmp = null, anim = null, start = 0;
    var t0 = new Date();
    
    for (var i = animated.length - 1; i >= 0; i--)
    {
        tmp = animated[i];
        
        // Might want to disable animation for a bit without removing from
        // the queue, to move or something
        if (tmp.isAnimating == false) continue;
        
        anim = tmp.currentAnimation;
        start = anim.start;
        if (t0 - tmp.lastUpdate > anim.quantum)
        {
            if (anim.loop == false)
                tmp.animIndex++;
            else if (tmp.animReverse == false)
                tmp.animIndex++;
            else
                tmp.animIndex--;
            
            if (tmp.animIndex >= start + anim.count)
            {
                if (anim.loop == true)
                {
                    tmp.animReverse = true;
                    tmp.animIndex = start + anim.count - 2;
                } else {
                    tmp.animIndex = start;
                }
                
                if (tmp.notifyOnAnimationCompletion == true)
                    // If the callback returns false, skip animating this frame
                    if (tmp.finishedAnimating(t0) == false)
                        continue;
                
            } else if (tmp.animIndex < start) {
                tmp.animReverse = false;
                tmp.animIndex = start + 1;
            }
            
            tmp.img = anim.array[tmp.animIndex];
            if (tmp.moving == false)
                map.updateBuffer(true, tmp.px, tmp.py, tmp.w, tmp.h);
            tmp.lastUpdate = t0;
        }
    }
    
    return true;
}

function SpriteSheet(img, name, w, h, array)
{
    this.name = name;
    this.start = -1;
    this.count = -1;
    this.array = array;
    
    this.initSprites(img, w, h);
}

SpriteSheet.prototype = {
    
    initSprites: function(img, w, h)
    {
        var start = this.array.length;
        var wide = img.width / w;
        var high = img.height / h;
        var x = 0, y = 0, p = null, ctx = null;
        var count = 0;
        while (y < h)
        {
            p = $('<canvas>')[0];
            p.width = wide;
            p.height = high;
            ctx = p.getContext('2d');
            ctx.drawImage(img,x*wide,y*high,wide,high,0,0,wide,high);
            this.array.push(p);
            count++;
            if ( ++x == w)
            {
                x = 0;
                y++;
            }
        }
        
        if (count > 0)
        {
            this.start = start;
            this.count = count;
            sheets[this.name] = self;
        }
    },
    
    destroy: function ()
    {
        // Do the following to free up memory taken up by the canvas objects
        
        var tmp = null;
        for (var i = this.start; i - this.start < this.count; i++)
        {
            tmp = this.array[i];
            this.array[i] = null;
            if (tmp != null) delete tmp;
        }
        
        this.start = -1;
        this.count = -1;
        this.name = null;
    },
};

function pixelProjection(x, y, z)
{
    var px, py;
    
    px = 0;
    py = 0;
    
    px += x * tileHeight;
    py += x * (tileHeight >> 1);
    
    px -= z * tileHeight;
    py += z * (tileHeight >> 1);
    
    py -= y * ((tileHeight >> 1) + 1);
    
    return {px: px, py: py};
}

function Background (canvas)
{
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    
    return true;
}

Background.prototype = {
    
    clear: function ()
    {
        this.canvas.width = this.width;
        
        return true;
    },
    
    linearVerticalGradient: function ()
    {
        var bgCtx = this.context;
        var grad = bgCtx.createLinearGradient(0,0,0,viewHeight);
        grad.addColorStop(0, "#bbdcf5");
        grad.addColorStop(1, "#84a69e");
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0,0,viewWidth, viewHeight);
        
        return true;
    },
    
    setColor: function (colorString)
    {
        var bgCtx = $('#bg')[0].getContext("2d");
        bgCtx.fillStyle = colorString;
        bgCtx.fillRect(0,0,viewWidth, viewHeight);
        
        return true;
    },
    
};

function Overlay (canvas)
{
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    
    return true;
}

Overlay.prototype = {
    
    clear: function()
    {
        this.canvas.width = this.width;
        return true;
    },
    
    whiteVerticalGradient: function ()
    {
        var fgCtx = this.context;
        var grad = fgCtx.createLinearGradient(0,0,0,viewHeight);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(.15, "rgba(255,255,255,.25)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        fgCtx.fillStyle = grad;
        fgCtx.fillRect(0,0,this.width, this.height);
        
        return true;
    },
    
    blackHorazontalBars: function ()
    {
        var fgCtx = this.context;
        var grad = fgCtx.createLinearGradient(0,0,0,viewHeight);
        grad.addColorStop(0, "rgba(0,0,0,.75)");
        grad.addColorStop(.10, "rgba(0,0,0,0)");
        grad.addColorStop(.90, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,.75)");
        fgCtx.fillStyle = grad;
        fgCtx.fillRect(0,0,this.width, this.height);
        
        return true;
    },
    
    greyTranslucent: function ()
    {
        var fgCtx = this.context;
        fgCtx.fillStyle = "rgba(0,0,0,.4)";
        fgCtx.fillRect(0,0,this.width, this.height);
        
        return true;
    },
    
}

function moveBuffer(x, y)
{
    // Return true if the buffer has changed
    if (x == bufferX && y == bufferY)
        return false;
    
    var t0 = new Date();
    
    var xmagnitude = 0, ymagnitude = 0;
    var xpositive, ypositive;
    var xfrom = 0;
    var yfrom = 0;
    var xto = 0;
    var yto = 0;
    
    if (x != bufferX)
    {
        xmagnitude = x - bufferX;
        xpositive = xmagnitude > 0 ? true : false;
        xmagnitude = Math.abs(xmagnitude);
        
        if (xpositive == true)
        {
            xfrom = xmagnitude;
            xto = 0;
        } else {
            xfrom = 0;
            xto = xmagnitude;
        }
        
        bufferX = x;
    }
    
    if (y != bufferY)
    {
        ymagnitude = y - bufferY;
        ypositive = ymagnitude > 0 ? true : false;
        ymagnitude = Math.abs(ymagnitude);
        
        if (ypositive == true)
        {
            yfrom = ymagnitude;
            yto = 0;
        } else {
            yfrom = 0;
            yto = ymagnitude;
        }
        
        bufferY = y;
    }
    
    // Check to make sure that we've not moved entirely out of bounds of buffer
    if (xmagnitude >= bufferWidth || ymagnitude >= bufferHeight)
    {
        map.updateBuffer(true, bufferX, bufferY, bufferWidth, bufferHeight);
        var t1 = new Date();
        //log("Reinit buffer: " + (t1-t0) + "ms");
        return true;
    }
    
    // Move the part of the existing image that can be used
    var w = bufferWidth - xmagnitude;
    var h = bufferHeight - ymagnitude;
    var oldCO = bufferCtx.globalCompositeOperation;
    bufferCtx.globalCompositeOperation = "copy"; // Magic!
    bufferCtx.drawImage(buffer, xfrom, yfrom, w, h, xto, yto, w, h);
    bufferCtx.globalCompositeOperation = oldCO;
    
    // Reclip the areas that need redrawing
    if (xmagnitude > 0)
    {
        if (xpositive == true)
            map.updateBuffer(false,bufferX+w, bufferY, xmagnitude, bufferHeight);
        else
            map.updateBuffer(false, bufferX, bufferY, xmagnitude, bufferHeight);
        
        //log("redraw: " + xmagnitude +"*"+bufferHeight);
    }
    
    if (ymagnitude > 0)
    {
        var px = bufferX;
        if (xmagnitude > 0 && xpositive == false)
            px += xmagnitude;
        
        if (ypositive == true)
            map.updateBuffer(false, px, bufferY + h, w, ymagnitude);
        else
            map.updateBuffer(false, px, bufferY, w, ymagnitude);
        
        //log("redraw: " + w +"*"+ymagnitude);
    }
    
    var t1 = new Date();
    //log("Move buffer: " + (t1-t0) + "ms");
    
    return true;
}

function setMessage(string)
{
    var msgCanvas = $('#msg')[0];
    var msgCtx = msgCanvas.getContext("2d");
    
    // Compute the y location to start from
    var msgy = (msgCanvas.height - msgTypeSize) >> 1;
    // Add 1 or 2 here because we're using ideographic baseline in order
    // to support chinese characters
    msgy += msgTypeSize + 1;
    
    // Draw the message
    msgCtx.clearRect(0,0,msgCanvas.width, msgCanvas.height);
    msgCtx.fillStyle = 'rgba(0,0,0,1)';
    msgCtx.globalAlpha = .5;
    msgCtx.fillRect(0,0,viewWidth, viewHeight);
    msgCtx.globalAlpha = 1;
    msgCtx.font = "bold " + msgTypeSize + "px sans-serif";
    msgCtx.textBaseline = "ideographic";
    msgCtx.fillStyle = 'rgba(255,255,255,.9)';
    msgCtx.strokeStyle = 'rgba(0,0,0,.5)';
    msgCtx.strokeText(string, msgLeftPadding, msgy);
    msgCtx.fillText(string, msgLeftPadding, msgy);
}

function initGraphics()
{
    // TODO: eventually this should only build tiles that the map needs...
    var tmp = new SpriteSheet(terrainImage, "Terrain",
        tileSheetWidth, tileSheetHeight, terrainSprites);
    
    initTerrain(terrainNames, tmp);
    
    bootstrapKirbyAnimations();
}

function secondarySelection(obj, buffer, px, py)
{
    buffer.drawImage(obj.img, px, py);
    var prev_context = buffer.globalAlpha;
    buffer.globalAlpha = secondarySelectionAlpha;
    buffer.drawImage(terrainSprites[secondarySelectionSprite], px, py);
    buffer.globalAlpha = prev_context;
}

function transparentShader(obj, buffer, px, py)
{
    var prev_context = buffer.globalAlpha;
    buffer.globalAlpha = .75;
    buffer.drawImage(obj.img, px, py);
    buffer.globalAlpha = prev_context;
}

function primarySelection(obj, buffer, px, py)
{
    buffer.drawImage(terrainSprites[1], px, py);
}

function shadowShader(obj, buffer, px, py)
{
    if (obj.shadow == 0) return;
    
    buffer.drawImage(obj.img, px, py);
    var prev_context = buffer.globalAlpha;
    buffer.globalAlpha = obj.shadow;
    buffer.drawImage(terrainSprites[shadowMaskTile], px, py);
    buffer.globalAlpha = prev_context;
}

function drawEscapedString(c, str, default_style, px, py, w)
{
    if (c == null || str == null) return false;
    
    var tmp = str.split(text_token);
    
    // If there were no escape chars in the string
    if (tmp[0].length == str.length)
    {
        c.fillStyle = default_style;
        c.fillText(str, px, py);
        return true;
    }
    
    var cind, o, cpx = px, len = tmp.length;
    for (var i = 0; i < len; i++)
    {
        o = tmp[i];
        cind = parseInt(o);
        if (isNaN(cind) == false)
        {
            c.fillStyle = text_styles[cind];
            if (cind > 9)
                o = o.substring(2);
            else
                o = o.substring(1);
        }
        
        c.fillText(o, cpx, py);
        cpx += c.measureText(o).width;
    }
}

