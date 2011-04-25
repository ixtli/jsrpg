// global instance of Interface object
var ui = null;

function WindowAnimation(w, callback)
{
    this.stepCount = {px: 0, py: 0, width: 0, height: 0, alpha: 0};
    this.speed = {px: 0, py: 0, width: 0, height: 0, alpha: 0};
    this.finalState = null;
    this.quantum = 99999;
    this.lastUpdate = new Date();
    this.completionCallback = callback;
    
    // Save the pre-animation metrics of the window, if the caller wants
    if (w != null) this.saveWindowMetrics(w);
}

WindowAnimation.prototype = {
    
    saveWindowMetrics: function(w)
    {
        if (w == null) return false;
        
        this.finalState = {px: 0, py: 0, width: -1, height: -1, alpha: -1};
        var fstate = this.finalState;
        
        fstate.width = w.width;
        fstate.height = w.height;
        fstate.px = w.px;
        fstate.py = w.py;
        fstate.alpha = w.alpha;
        
        return true;
    },
    
    restoreWindowMetrics: function(w)
    {
        var state = this.finalState;
        if (state == null) return false;
        
        w.px = state.px;
        w.py = state.py;
        if (state.width > 0) w.width = state.width;
        if (state.height > 0) w.height = state.height;
        
        var a = state.alpha;
        if (a >= 0 && a <= 1) w.alpha = a;
        
        return true;
    },
    
};

function animateWindows()
{
    var list = ui.animatingWindows;
    var quant = ui.quantum;
    var w, t, s, time, anim, delta = false;
    var dpx, dpy, dw, dh, stemp, sizeDelta;
    
    if (quant == null) return false;
    
    for (var i = list.length - 1; i >= 0; i--)
    {
        w = list[i];
        
        if (w.animationStack.length < 1)
        {
            list.splice(i,1);
            continue;
        }
        
        anim = w.animationStack[0];
        time = new Date();
        
        // Respect element's animation quantum
        if (anim.quantum > quant && anim.quantum > (time - anim.lastUpdate))
            continue;
        anim.lastUpdate = time;
        
        if (w.hidden == true) continue;
        
        // Are we changing location or size?
        t = anim.stepCount;
        s = anim.speed;
        
        // If we're not moving the window around
        if (t == null || s == null)
        {
            // If not, just redraw the window
            w.update(0, 0, 0, 0, true);
            continue;
        }
        
        dpx = w.px;
        dpy = w.py;
        dh = w.height;
        dw = w.width;
        sizeDelta = false;
        
        // Apply the transition
        if (--t.px > 0)
        {
            stemp = s.px;
            w.px += stemp;
            if (stemp > 0) dpx -= stemp;
            else dw += stemp;
        }
        
        if (--t.py > 0)
        {
            stemp = s.py;
            w.py += stemp;
            if (stemp > 0) dpy -= stemp;
            else dh += stemp;
        }
        
        if (--t.width > 0)
        {
            stemp = s.width;
            w.width += stemp;
            if (stemp > 0) dw += stemp;
            sizeDelta = true;
        }
        
        if (--t.height > 0)
        {
            stemp = s.height;
            w.height += stemp;
            if (stemp > 0) dh += stemp;
            sizeDelta = true;
        }
        
        if (--t.alpha > 0)
        {
            w.alpha += s.alpha;
            if (w.alpha > 1) w.alpha = 1;
            else if (w.alpha < 0) w.alpha = 0;
            
            // Stop changing alpha if it's already > 1 or < 0
            if (w.alpha == 1 || w.alpha == 0) t.alpha = 0;
        }
        
        if (sizeDelta == true) w.update(0,0,0,0,false);
        
        // Check to see if the object has reached the goal state
        if (t.px <= 0 && t.py <= 0 && t.width <= 0 && t.height <= 0 &&
            t.alpha <= 0)
        {
            if (w.completeAnimation() == true)
            {
                list.splice(i,1);
                delta = true;
            }
        }
        
        // Redraw the display where it's been updated
        // If height or width is <= 0, ui.update will redraw itself entirely
        // so substitute in 1 if this is the case.
        ui.update(dpx, dpy, dw > 1 ? dw : 1, dh > 1 ? dh : 1);
    }
    
    // Has the list length changed?
    if (delta == true) ui.resetAnimationInterval();
    
    return true;
}

function Interface (canvas)
{
    // Double buffer drawing
    this.canvas = null;
    this.canvasCtx = null;
    this.buffer = null;
    this.bufferCtx = null;
    
    this.width = 0;
    this.height = 0;
    
    // Array of interface objects
    this.windowList = [];
    
    // Array of currently animating elements
    this.animatingWindows = [];
    this.quantum = 999999;
    
    this.captureInput = false;
    
    return this.init(canvas);
}

Interface.prototype = {
    
    init: function(canvas)
    {
        this.canvas = canvas;
        this.canvasCtx = this.canvas.getContext("2d");
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.buffer = $('<canvas>')[0];
        this.buffer.height = this.height;
        this.buffer.width = this.width;
        this.bufferCtx = this.buffer.getContext("2d");
        
        if (this.canvasCtx == null || this.bufferCtx == null) return false;
        
        // This avoids worrying about transparency when copying from buffer
        this.canvasCtx.globalCompositeOperation = "copy";
        
        // Register animation
        animationManager.registerAnimation("interface", animateWindows, 1);
        
        return true;
    },
    
    addWindow: function(object)
    {
        // This does not check for duplicates
        this.windowList.push(object);
        return true;
    },
    
    removeWindow: function(object)
    {
        // This removes the last instance of an object
        var a = this.windowList;
        
        for (var i = a.length - 1; i >= 0; i--)
        {
            if (a[i] === object)
            {
                a.splice(i, 1);
                return true;
            }
        }
        
        return false;
    },
    
    moveWindowToFront: function(object)
    {
        // Remove the last instance of object and push it to the back
        var a = this.windowList;
        
        for (var i = a.length - 1; i >= 0; i--)
        {
            if (a[i] === object)
            {
                a.splice(i, 1);
                a.push(object);
                object.displayOrderHasChanged();
                return true;
            }
        }
        
        return false;
    },
    
    moveWindowToBack: function(object)
    {
        // Remove the last instance of object and unshift it to the front
        var a = this.windowList;
        
        for (var i = a.length - 1; i >= 0; i--)
        {
            if (a[i] === object)
            {
                a.splice(i, 1);
                a.unshift(object);
                object.displayOrderHasChanged();
                return true;
            }
        }
        
        return false;
    },
    
    update: function(px, py, w, h)
    {
        var c = this.bufferCtx;
        var list = this.windowList;
        var len = list.length;
        if (len < 1) return false;
        
        var maxx = px + width, maxy = py + height;
        var opx = 0, opy = 0;
        
        var width = w > 0 ? w : this.width;
        var height = h > 0 ? h : this.height;
        if (px + width > this.width)
            width = this.width - px;
        
        if (py + height > this.height)
            height = this.height - py;
        
        // Push context, clip, and clear.
        c.save();
        c.beginPath();
        c.rect(px, py, width, height);
        c.closePath();
        c.clip();
        c.clearRect(px, py, width, height);
        
        // Draw things that are within the rect
        var o = null
        for (var i = 0; i < len; i++)
        {
            o = list[i];
            
            if (o.hidden == true) continue;
            
            opx = o.px;
            opy = o.py;
            
            if (opx >= maxx || opx + o.width <= px) continue;
            if (opy >= maxy || opy + o.height <= py) continue;
            
            c.globalAlpha = o.alpha;
            c.drawImage(o.img, opx, opy);
        }
        
        // Restore context
        c.restore();
        
        // Redraw!
        this.canvasCtx.drawImage(this.buffer, px, py, width, height,
            px, py, width, height);
        
        return true;
    },
    
    animate: function(w)
    {
        if (w == null) return false;
        if (w.animationStack.length < 1) return false;
        
        var list = this.animatingWindows;
        var animq = w.animationStack[0].quantum;
        
        // Edge case: Not yet animating
        if (list.length == 0)
        {
            // We have not yet begun to animate.
            list.push(w);
            this.quantum = animq;
            animationManager.setQuantum("interface", animq);
            animationManager.startAnimation("interface");
            return true;
        }
        
        // Insert into list keeping sorted by quantum
        if (animq < this.quantum)
        {
            // The added anim is on a faster interval than currently animating
            list.unshift(w);
            this.resetAnimationInterval();
        } else if (this.quantum == animq) {
            // The added anim is on the SAME interval as currently animating
            list.unshift(w);
        } else {
            // Not first, and not the same: Sort the list by quantum
            var q;
            for (var i = list.length - 1; i >= 0; i--)
            {
                q = list[i].animationStack[0].quantum;
                if (q < animq)
                {
                    list.splice(i + 1, 0, w);
                    break;
                }
            }
        }
        
        return true;
    },
    
    stopAnimating: function(w)
    {
        if (w == null) return false;
        if (w.animationStack.length < 1) return false;
        
        var list = this.animatingWindows;
        var len = list.length;
        if (len < 1) return false;
        
        // Find this window in the list of animating windows and remove it
        var found = null;
        for (var i = len - 1; i >= 0; i--)
        {
            if (list[i] === w)
            {
                found = list.splice(i, 1);
                break;
            }
        }
        
        // Was it actually in the animating list?
        if (found == null) return false;
        
        // Apply all the functions and final states of the animation stack
        // without actually animating through them.
        w.finishAnimating();
        
        this.resetAnimationInterval();
        
        return true;
    },
    
    resetAnimationInterval: function()
    {
        var list = this.animatingWindows;
        
        if (list.length < 1)
        {
            animationManager.stopAnimation('interface');
            this.quantum = null;
            return true;
        }
        
        var first = list[0].animationStack[0].quantum;
        if (this.quantum != first)
        {
            this.quantum = first;
            animationManager.setQuantum('interface', first);
            return true;
        }
        
        // Return false to indicate no change
        return false;
    },
    
};

function InterfaceWindow (name, px, py, width, height)
{
    this.name = name;
    
    // Geometry relative to the ui
    this.px = px;
    this.py = py;
    this.width = width;
    this.height = height;
    
    // Disable this after you're finished populating it to avoid unnecessary
    // refreshes
    this.hidden = true;
    
    // Graphics context
    this.img = null;
    this.ctx = null;
    
    // Elements
    this.elementList = [];
    
    // Graphics settings
    this.backgroundFxn = null;
    this.borderStyle = null;
    this.lineWidth = 4;
    this.alpha = 1;
    
    // Animation
    this.animationStack = [];
    
    this.debug = false;
    
    return this.init();
}

InterfaceWindow.prototype = {
    
    animations: {
        
        zoom_in: function(w, args)
        {
            var anim = new WindowAnimation(w, args.callback);
            var trans = anim.stepCount;
            var speed = anim.speed;
            
            // Correct the animation step size
            var step_size = args.step_size;
            if (step_size < 0) step_size = 1;
            
            // Save some local copies
            var target_width = w.width;
            var target_height = w.height;
            
            // Set the starting metrics of the window
            w.px += target_width >> 1;
            w.py += target_height >> 1;
            w.height = 1;
            w.width = 1;
            
            // Calculate and save the actual values
            trans.width = Math.floor((target_width / step_size) / 2) + 1;
            speed.width = step_size * 2;
            trans.px = Math.floor((target_width / 2) / step_size) + 1;
            speed.px = -step_size;
            trans.height = Math.floor((target_height / step_size) / 2) + 1;
            speed.height = step_size * 2;
            trans.py = Math.floor((target_height / 2) / step_size) + 1;
            speed.py = -step_size;
            
            // Set the animation quantum and normalize
            anim.quantum = 1000 / constants.fps;
            if (step_size < 1) anim.quantum /= step_size;
            
            // Append this animation onto the window
            w.animationStack.push(anim);
            
            // Start animating
            return true;
        },
        
        open_up: function (w, args)
        {
            // The first animation is the window opening width-wise
            var anim = new WindowAnimation(null, null);
            var secondAnim = new WindowAnimation(w, args.callback);
            var trans = anim.stepCount;
            var speed = anim.speed;
            
            // Also save some values locally so we can mess with them
            var target_width = w.width;
            var target_height = w.height;
            
            // Calculate the animation step count
            var step_size = args.step_size;
            if (step_size < 0) step_size = 1;
            
            // Set the intial state of the window
            w.px += target_width >> 1;
            w.py += target_height >> 1;
            w.height = 1;
            w.width = 1;
                        
            // Amount of steps to take, 1-indexed (not zero).
            trans.width = Math.floor((target_width / step_size) / 2) + 1;
            // Amount to increase width per step
            speed.width = step_size * 2;
            
            trans.px = Math.floor((target_width / 2) / step_size) + 1;
            speed.px = -step_size;
            
            anim.quantum = 1000 / constants.fps;
            if (step_size < 1) anim.quantum /= step_size;
            
            // "Open" vertically after horazontal
            trans = secondAnim.stepCount;
            speed = secondAnim.speed;
            
            trans.height = Math.floor((target_height / step_size) / 2) + 1;
            speed.height = step_size * 2;
            trans.py = Math.floor((target_height / 2) / step_size) + 1;
            speed.py = -step_size;
            
            secondAnim.quantum = 1000 / constants.fps;
            if (step_size < 1) secondAnim.quantum /= step_size;
            
            w.animationStack.push(anim);
            w.animationStack.push(secondAnim);
            
            // Start the animation
            return true;
        },
        
        close_up: function (w, args)
        {
            var anim = new WindowAnimation(w, args.callback);
            var target_width = w.width;
            
            anim.saveWindowMetrics(w);
            
            var step_size = args.step_size;
            if (step_size < 0) step_size = 1;
            
            anim.stepCount.width = Math.ceil(target_width / step_size) + 1;
            anim.speed.width = -step_size;
            
            anim.quantum = 1000 / constants.fps;
            if (step_size < 1) anim.quantum /= step_size;
            
            w.animationStack.push(anim);
            
            return true;
        },
        
        fade: function (w, args)
        {
            var anim = new WindowAnimation(w, args.callback);
            var trans = anim.stepCount;
            var speed = anim.speed;
            
            var step_size = args.step_size;
            if (step_size == 0) step_size = 1;
            
            w.alpha = step_size > 0 ? 0 : 1;
            
            trans.alpha = Math.abs(step_size);
            speed.alpha = 1 / step_size;
            
            anim.quantum = 1000 / constants.fps;
            if (step_size < 1 && step_size > -1)
                anim.quantum /= Math.abs(step_size);
            
            w.animationStack.push(anim);
            
            return true;
        },
        
    },
    
    init: function()
    {
         this.img = $('<canvas>')[0];
         this.img.width = this.width;
         this.img.height = this.height;
         this.ctx = this.img.getContext("2d");
         
         if (this.ctx == null) return false;
         
         ui.addWindow(this);
         
         return true;
    },
    
    update: function(px, py, w, h, refresh)
    {
        // PX and PY are relative to this window
        
        var elist = this.elementList;
        var e = null, epx = 0, epy = 0, emaxy = 0, emaxx = 0;
        var c = this.ctx;
        var delta = 0;
        
        // Check to make sure this rectangle doesn't go out of bounds
        var width = w > 0 ? w : this.width;
        var height = h > 0 ? h : this.height;
        if (px + width > px + this.width)
            width = this.width - Math.abs(width - this.width);
        
        if (py + height > py + this.height)
            height = this.height - Math.abs(height + this.height);
        
        var maxx = px + width;
        var maxy = py + height;
        
        c.save();
        c.beginPath();
        c.rect(px, py, width, height);
        c.closePath();
        c.clip();
        c.clearRect(px, py, width, height);
        
        if (this.debug == true)
        {
            c.fillStyle = "rgba(255,0,0,.5)";
            c.fillRect(px,py,width,height);
        }
        
        if (this.backgroundFxn != null)
            this.backgroundFxn(c,px,py,w,h);
        
        for (var i = elist.length - 1; i >= 0; i--)
        {
            e = elist[i];
            
            if (e.hidden == true) continue;
            
            epx = e.px;
            epy = e.py;
            emaxx = epx + e.width;
            emaxy = epy + e.height;
            
            if (epx >= maxx || emaxx <= px) continue;
            if (epy >= maxy || emaxy <= py) continue;
            
            // adjust width and height so that we don't try to draw outside
            // the bounds of the elements or more than we need to
            
            e.update(c, epx, epy, width, height);
        }
        
        if (this.borderStyle != null)
        {
            c.strokeStyle = this.borderStyle;
            c.lineWidth = this.lineWidth;
            c.strokeRect(0, 0, width, height);
        }
        
        c.restore();
        
        if (refresh == true && this.hidden == false)
            ui.update(this.px + px, this.py + py, width, height);
        
        return true;
    },
    
    hide: function(args)
    {
        // Under certain circumstances, hide/show animations can get confused
        // if they are interrupted.  So quickly resolve the current animation
        // before we change the .hidden member value
        if (this.animationStack.length > 0)
            ui.stopAnimating(this);
        
        if (args == null)
        {
            this.hidden = true;
            ui.update(this.px, this.py, this.width, this.height);
            return true;
        }
        
        args.callback = function () {
            this.alpha = 1;
            this.hide(null);
            return null;
        };
        
        this.animate(args);
        
        return true;
    },
    
    show: function(args)
    {
        // Under certain circumstances, hide/show animations can get confused
        // if they are interrupted.  So quickly resolve the current animation
        // before we change the .hidden member value
        if (this.animationStack.length > 0)
            ui.stopAnimating(this);
        
        this.hidden = false;
        
        if (args != null)
            this.animate(args);
        else
            this.update(0,0,0,0, true);
        
        return true;
    },
    
    displayOrderHasChanged: function()
    {
        
    },
    
    addElement: function(element)
    {
        // If u is true, update will cause the ui to refresh
        this.elementList.push(element);
        this.update(element.px, element.py, element.width, element.height, true);
        
        return true;
    },
    
    removeElement: function()
    {
        var e = this.elementList;
        
        for (var i = e.length - 1; i >= 0; i--)
        {
            if (e[i] === object)
            {
                var f = e.splice(i, 1);
                this.update(this.px+f.px, this.py+f.py, f.width, f.height, true);
                return true;
            }
        }
        
        return false;
    },
    
    setBGFunction: function(fxn)
    {
        this.backgroundFxn = fxn;
        this.update(0,0,0,0);
    },
    
    setBorderStyle: function(style)
    {
        this.borderStyle = style;
        this.update(0,0,0,0);
    },
    
    finishAnimating: function()
    {
        do {}
        while (this.completeAnimation() == false);
        
        // update self
        this.update(0,0,0,0,true);
        
        // Return true to signal that there are no more animations
        return true;
    },
    
    completeAnimation: function()
    {
        // Completes the last animation in the window's animation stack
        // The caller is responsible for redrawing
        var stack = this.animationStack;
        
        // Return true if there are no more animations
        if (stack.length < 1) return true;
        
        // Animation at [0] is the 'current' animation
        var c = stack.shift();
        
        c.restoreWindowMetrics(this);
        
        if (c.completionCallback != null)
            c.completionCallback.call(this);
        
        // Return true if there are no more animations
        return stack.length < 1 ? true : false;
    },
    
    animate: function(args)
    {
        if (args == null) return false;
        
        // Forcefully reset animation state if it's currently animating
        if (this.animationStack.length > 0)
            ui.stopAnimating(this);
        
        // Do animation
        if (this.animations[args.animation] != null)
        {
            if (this.animations[args.animation](this, args) == true)
                if (this.animationStack.length > 0)
                    ui.animate(this);
        } else {
            log("Invalid animation name: " + args.animation);
            if (args.callback != null) args.callback();
            return false;
        }
        
        return true;
    },
    
};

function ProgressBar (name, w, px, py, width, height, min, max, val)
{
    this.name = name;
    this.window = null;
    
    // Geometry relative to the window 
    this.px = px;
    this.py = py;
    this.height = height;
    this.width = width;
    
    this.color = "red";
    
    this.hidden = false;
    
    this.min = min;
    this.max = max;
    this.val = val;
    
    this.init(w);
}

ProgressBar.prototype = {
    
    init: function (w)
    {
        if (w == null) return false;
        
        if (w.addElement(this) == false)
            return false;
        
        this.window = w;
        return true;
    },
    
    setMin: function (min)
    {
        this.min = min;
    },
    
    setMax: function (max)
    {
        this.max = max;
    },
    
    setVal: function (val)
    {
        this.val = val;
    },
    
    setColor: function (color)
    {
        this.color = color;
    },
    
    update: function (c, px, py, w, h)
    {
        // ignore request for location for now
        c.fillStyle = this.color;
        var oldAlpha = c.globalAlpha;
        c.globalAlpha = .6;
        c.fillRect(this.px, this.py, this.width, this.height);
        c.globalAlpha = oldAlpha;
        return true;
    },
    
};

function InterfaceLabel (name, w, str, px, py)
{
    this.name = name;
    this.hidden = false;
    this.window = null;
    
    // Geometry relative to the window 
    this.px = px;
    this.py = py;
    
    // Type metrics
    this.width = 0;
    this.height = 10;
    this.font = "10pt sans-serif";
    this.string = null;
    
    return this.init(w, str);
}

InterfaceLabel.prototype = {
    
    init: function (w, str)
    {
        if (w == null) return false;
        
        if (w.addElement(this) == false)
            return false;
        
        this.window = w;
        this.setString(str);
        
        return true;
    },
    
    setString: function (str)
    {
        var w = this.window;
        
        this.string = str;
        w.ctx.font = this.font;
        this.width = (w.ctx.measureText(this.string)).width;
        
        this.window.update(this.px, this.py, this.width, this.height, true);
        
        return true;
    },
    
    update: function (c, px, py, w, h)
    {
        c.font = this.font;
        c.fillStyle = "white";
        drawEscapedString(c, this.string, "white", px, py + this.height, w);
    },
    
};

function ImageWell (name, w, img, px, py)
{
    this.name = name;
    this.window = null;
    this.hidden = false;
    
    this.px = px;
    this.py = py;
    
    this.img = null;
    this.alpha = 1;
    this.width = 0;
    this.height = 0;
    
    return this.init(w, img);
}

ImageWell.prototype = {
    
    init: function (w, img)
    {
        if (w == null) return false;
        
        if (w.addElement(this) == false)
            return false;
        
        this.window = w;
        this.setImg(img);
        
        return true;
    },
    
    setImg: function (img)
    {
        
        if (img != null)
        {
            this.width = img.width;
            this.height = img.height;
        } else {
            this.width = 0;
            this.height = 0;
        }
        
        this.img = img;
        
        this.window.update(this.px, this.py, this.width, this.height, true);
        
        return true;
    },
    
    setAlpha: function (alpha)
    {
        this.alpha = alpha;
        return true;
    },
    
    update: function (c, px, py, w, h)
    {
        if (this.img == null) return false;
        
        var width = w;
        var height = h;
        var px_offset = px - this.px;
        var py_offset = py - this.py;
        if (px_offset + width > px_offset + this.width)
            width = w - Math.abs(width - this.width);
        if (py_offset + height > py_offset + this.height)
            height = h - Math.abs(height - this.height);
        
        var alpha = c.globalAlpha;
        c.globalAlpha = this.alpha;
        c.drawImage(this.img, px_offset, py_offset, width, height, px, py,
            width, height);
        c.globalAlpha = alpha;
        
        return true;
    },
    
};

