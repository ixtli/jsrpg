// global instance of Interface object
var ui = null;

function animateWindows()
{
    var list = ui.animatingWindows;
    var w, t, s, time, finished = [];
    
    // Calculated metrics
    var dpx, dpy, dw, dh, sx, sy, sw, sh, sizeDelta;
    
    for (var i = list.length - 1; i >= 0; i--)
    {
        w = list[i];
        time = new Date();
        
        // Respect that element's animation quantum
        if (w.quantum != ui.quantum && w.quantum > (time - w.lastUpdate))
            continue;
        w.lastUpdate = time;
        
        // Are we changing location or size?
        t = w.animationTransform;
        
        // If we're not moving the window around
        if (t == null)
        {
            // If not, just redraw the window
            w.update(0, 0, 0, 0, true);
            continue;
        }
        
        s = w.transformSpeed;
        sx = s.px;
        sy = s.py;
        sh = s.height;
        sw = s.width;
        dpx = w.px;
        dpy = w.py;
        dh = w.height;
        dw = w.width;
        sizeDelta = false;
        
        // Apply the transition
        if (--t.px > 0)
        {
            w.px += sx;
            if (sx > 0) dpx -= sx;
            else dw += sx;
        }
        
        if (--t.py > 0)
        {
            w.py += sy;
            if (sy > 0) dpy -= sy;
            else dh += sy;
        }
        
        if (--t.width > 0)
        {
            w.width += sw;
            
            // If we're DECERASING width, redraw the area that used to
            // be covered by the window
            if (sw < 0) dw += sw;
            sizeDelta = true;
        }
        
        if (--t.height > 0)
        {
            w.height += sh;
            
            // The same that applies to width applies to height
            sizeDelta = true;
        }
        
        // Redraw the window's context first if the size has changed
        if (sizeDelta == true)
            w.update(0,0,0,0,false);
        
        // Redraw the display where it's been updated
        // If height or width is 0, ui.update will redraw itself entirely
        // so substitute in some values.
        ui.update(dpx, dpy, dw > 1 ? dw : 1, dh > 1 ? dh : 1);
        
        // Check to see if the object has reached the goal state
        if (t.px <= 0 && t.py <= 0 && t.width <= 0 && t.height <= 0)
            finished.push(i);
    }
    
    // Remove finished elements.  Remember that it's ordered backwards!
    t = finished.length;
    if (t == 0) return true;
    for (var i = 0; i < t; i++)
        finished[i] = list.splice(finished[i],1)[0];
    
    // If the list is empty, stop animating
    if (list.length == 0)
    {
        ui.finishedAnimating();
    } else if (finished[t - 1] == 0) {
        // If the first element of the list was removed reset quantum
        if (list[0].quantum != ui.quantum)
        {
            clearInterval(ui.animationInterval);
            ui.quantum = list[0].quantum;
            ui.animationInterval = setInterval(animateWindows, ui.quantum);
        }
    }
    
    for (var i = 0; i < t; i++)
        if (w.animationHasCompleted != null)
            w.animationHasCompleted();
    
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
    this.quantum = 0;
    this.animationInterval = null;
    
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
        
        // Do this so we can avoid clearing the canvas every time we draw it
        this.canvasCtx.globalCompositeOperation = "copy";
        
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
        if (w.quantum < 1) return false;
        
        if (this.animationInterval == null)
        {
            // We have not yet begun to animate.
            this.animatingWindows.push(w);
            this.quantum = w.quantum;
            this.animationInterval = setInterval(animateWindows, this.quantum);
            return true;
        }
        
        // Insert into list keeping sorted by quantum
        var list = this.animatingWindows;
        if (w.quantum < this.quantum)
        {
            list.unshift(w);
            clearInterval(this.animationInterval);
            this.quantum = list[0].quantum;
            this.animationInterval = setInterval(animateWindows, this.quantum);
        } else if (w.quantum == list[0].quantum) {
            list.unshift(w);
        } else {
            // Sort by quantum
            for (var i = list.length - 1; i >= 0; i--)
            {
                if (list[i].quantum < w.quantum)
                {
                    list.splice(i + 1, 0, w);
                    break;
                }
            }
        }
        
        return true;
    },
    
    finishedAnimating: function()
    {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
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
    this.animationTransform = null;
    this.transformSpeed = null;
    this.quantum = 0;
    this.lastUpdate = new Date();
    this.animationHasCompleted = null;
    
    this.debug = false;
    
    return this.init();
}

InterfaceWindow.prototype = {
    
    animations: {
        open: function (w, s) {
            
            var ydif = w.height >> 1;
            var xdif = w.width >> 1;
            var trans = {px: xdif >> 1, py: 0, width: 100, height: 0};
            var speed = {px: -2, py: 0, width: 3, height: 0};
            
            w.py += ydif;
            w.px += xdif
            w.height = 1;
            w.width = 1;
            w.animationTransform = trans;
            w.transformSpeed = speed;
            w.quantum = 1;
            ui.animate(w);
            
            w.animationHasCompleted = function () {
                var trans = {px: 0, py: ydif >> 1, width: 0, height: 25};
                var speed = {px: 0, py: -2, width: 0, height: 4};
                
                this.animationTransform = trans;
                this.transformSpeed = speed;
                this.quantum = 1;
                ui.animate(this);
                this.animationHasCompleted = null;
            };
            
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
    
    update: function(px, py, w, h, update)
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
        
        if (update == true && this.hidden == false)
            ui.update(this.px + px, this.py + py, width, height);
        
        return true;
    },
    
    hide: function()
    {
        this.hidden = true;
        ui.update(this.px, this.py, this.width, this.height);
    },
    
    show: function(animation, speed)
    {
        this.hidden = false;
        
        if (animation != null && animation != "")
            this.animations[animation](this, speed);
        
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

