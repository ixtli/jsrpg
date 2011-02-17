// Canvas elements
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

function SpriteSheet(img, name, w, h, array)
{
    this.name = name;
    this.start = -1;
    this.count = -1;
    this.array = array;
    
    this.initSprites = function(img, w, h) {
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
            array.push(p);
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
    }
    
    this.destroy = function () {
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
    }
    
    this.initSprites(img, w, h);
}

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

function setBackgroundLinearVerticalGradient()
{
    var bgCtx = $('#bg')[0].getContext("2d");
    var grad = bgCtx.createLinearGradient(0,0,0,viewHeight);
    grad.addColorStop(0, "#bbdcf5");
    grad.addColorStop(1, "#84a69e");
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0,0,viewWidth, viewHeight);
}

function setBackgroundColor(colorString)
{
    var bgCtx = $('#bg')[0].getContext("2d");
    bgCtx.fillStyle = colorString;
    bgCtx.fillRect(0,0,viewWidth, viewHeight);
}

function setOverlayWhiteVerticalGradient()
{
    var fgCtx = $('#fg')[0].getContext("2d");
    var grad = fgCtx.createLinearGradient(0,0,0,viewHeight);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(.15, "rgba(255,255,255,.25)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    fgCtx.fillStyle = grad;
    fgCtx.fillRect(0,0,viewWidth, viewHeight);
}

function setOverlayBlackHorazontalBars()
{
    var fgCtx = $('#fg')[0].getContext("2d");
    var grad = fgCtx.createLinearGradient(0,0,0,viewHeight);
    grad.addColorStop(0, "rgba(0,0,0,.75)");
    grad.addColorStop(.10, "rgba(0,0,0,0)");
    grad.addColorStop(.90, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,.75)");
    fgCtx.fillStyle = grad;
    fgCtx.fillRect(0,0,viewWidth, viewHeight);
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
    
    tmp = new SpriteSheet(kirbyImage, "Kirby",
        kirbySheetWidth, kirbySheetHeight, characterSprites);
}

function applyShader(obj, front, shader)
{
    // return false if not added
    if (obj == null) return false;
    
    var slist = obj.shaderList;
    for (var i = 0; i < slist.length; i++)
        if (slist[i] === shader) return false;
    
    if (front == true)
        slist.splice(0,0,shader);
    else
        slist.push(shader);
    
    obj.modified = true;
    
    return true; 
}

function removeShader(obj, shader)
{
    // Return false if shader not added
    if (obj == null || obj.modified == false)
        return false;
    
    var slist = obj.shaderList;
    for (var i = 0; i < slist.length; i++)
    {
        if (slist[i] === shader)
        {
            if (slist.length == 1) obj.modified = false;
            return slist.splice(i,1);
        }
    }
    
    return false;
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

