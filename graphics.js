// Canvas elements
var canvas = null;
var buffer = null;

// Drawing
var canvasContext = null;
var bufferCtx = null;
var clipStack = [];
var viewportDirty = false;
var viewWidth = null;
var viewHeight = null;

// buffer image
var bufferX = null;
var bufferY = null;

// Sprites
var sprites = [];

function Sprite(name, canv, w, h)
{
    this.name = name;
    this.img = canv;
    this.w = w;
    this.h = h;
    this.i = 0; // The index into the sprite array
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
    
    py -= y * (tileHeight >> 1);
    
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
    if (xmagnitude > bufferWidth || ymagnitude > bufferHeight)
    {
        map.updateBuffer(true, bufferX, bufferY, bufferWidth, bufferHeight);
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
            map.updateBuffer(true,bufferX+w, bufferY, xmagnitude, bufferHeight);
        else
            map.updateBuffer(true, bufferX, bufferY, xmagnitude, bufferHeight);
    }
    
    if (ymagnitude > 0)
    {
        var px = bufferX;
        if (xmagnitude > 0 && xpositive == false)
            px += xmagnitude;
        
        if (ypositive == true)
            map.updateBuffer(true, px, bufferY + h, w, ymagnitude);
        else
            map.updateBuffer(true, px, bufferY, w, ymagnitude);
    }
    
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

function initTiles()
{
    // eventually this should only build tiles that the map needs...
    
    // Make a new canvas
    for (var y = 0; y < tileSheetHeight; y++)
    {
        for (var x = 0; x < tileSheetWidth; x++)
        {
            var c = $('<canvas>')[0];
            c.width = tileGraphicWidth;
            c.height = tileGraphicHeight;
            
            // Assemble sprite
            var ctx = c.getContext('2d');
            // Draw a red border to see if there are any gaps anywhere.
            if (tileBorderDebug)
            {
                ctx.fillStyle = "rgba(255,0,0,0.25)";
                ctx.fillRect(0,0,tileGraphicWidth, tileGraphicHeight);
            }
            ctx.drawImage(terrainImage, x * tileGraphicWidth,
                y * tileGraphicHeight, tileGraphicWidth, tileGraphicHeight, 0,0,
                c.width, c.height);
            
            // make a sprite object
            var s = new Sprite(terrainNames[sprites.length], c,
                tileGraphicWidth, tileGraphicHeight);
            s.i = sprites.length;
            // Set up the mapSprites data structure
            sprites.push(s);
        }
    }
}
