// Canvas elements
var canvas = null;
var buffer = null;

// Drawing
var canvasContext = null;
var bufferCtx = null;
var clipStack = [];
var bufferDirty = false;
var viewWidth = null;
var viewHeight = null;

// buffer image
var bufferX = null;
var bufferY = null;
var bufferHeight = null;
var bufferWidth = null;

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
    
    py -= y * 17;
    
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
    
    /*
    var xmoved = 0;
    var ymoved = 0;
    var redraw = [];
    
    // Figure out where the buffer has moved
    if (old != null)
    {
        if (x > bufferX + bufferWidth)
            xmoved = 1; // Moved right
        else if (x < bufferX)
            xmoved = 2; // Moved left
        
        if (y > bufferY + bufferHeight)
            ymoved = 1; // Moved down
        else if (y < bufferY)
            ymoved = 2; // Moved up
    }
    
    // Edge-ish case: BOTH x and y moved
    if (xmoved != 0 && ymoved != 0)
    {
        if (xmoved == 1)
        {
            if (ymoved == 1)
            {
                // moved right and down, move SE quad to NW
                bufferCtx.drawImage(buffer,
                    viewWidth, viewHeight, viewWidth, viewHeight,
                    0, 0, viewWidth, viewHeight);
            } else {
                // moved right and up, move NE to SW
                bufferCtx.drawImage(buffer,
                    viewWidth, 0, viewWidth, viewHeight,
                    0, viewHeight, viewWidth, viewHeight);
            }
        } else {
            if (ymoved == 1)
            {
                // moved left and down, move SW to NE
                bufferCtx.drawImage(buffer,
                    0, viewHeight, viewWidth, viewHeight,
                    viewWidth, 0, viewWidth, viewHeight);
            } else {
                // moved left and up, move NW to SE
                bufferCtx.drawImage(buffer,
                    0, 0, viewWidth, viewHeight,
                    viewWidth, viewHeight, viewWidth, viewHeight);
            }
        }
    } else if (xmoved != 0) {
        // Only x moved
        if (xmoved == 1)
        {
            // moved right, move right half to left half
            bufferCtx.drawImage(buffer,
                viewWidth, 0, viewWidth, viewHeight << 1,
                0, 0, viewWidth, viewHeight << 1);
        } else {
            // moved left, move left half to right half
            bufferCtx.drawImage(buffer,
                0, 0, viewWidth, viewHeight << 1,
                viewWidth, 0, viewWidth, viewHeight << 1);
        }
    } else if (ymoved != 0) {
        // Only y moved
        if (ymoved == 1)
        {
            // moved down, move bottom half to top half
            bufferCtx.drawImage(bufferCtx,
                0, viewHeight, viewWidth << 1, viewHeight,
                0, 0, viewWidth << 1, viewHeight);
        } else {
            // moved up, move top half to bottom half
            bufferCtx.drawImage(bufferCtx,
                0, 0, viewWidth << 1, viewHeight,
                0, viewHeight, viewWidth << 1, viewHeight);
        }
    }
    
    // Redraw the sectors that need redrawing
    var clipArea = {px: 0, py: 0, w: viewWidth, h: viewHeight};
    for (var i = 0; i < redraw.length; i++)
    {
        // Anything that needs to be redrawn needs to be so because it is a
        // previously unrendered clipping region.
        switch (val)
        {
            case 0:
            clipArea.px = 0;
            clipArea.py = 0;
            clipStack.push(clipArea);
            break;
            
            case 1:
            clipArea.px = viewWidth;
            clipArea.py = 0;
            clipStack.push(clipArea);
            break;
            
            case 2:
            clipArea.px = 0;
            clipArea.py = viewHeight;
            clipStack.push(clipArea);
            break;
            
            default:
            case 3:
            clipArea.px = viewWidth;
            clipArea.py = viewHeight;
            clipStack.push(clipArea);
            break;
        }
    }
    
    if (redraw.length == 0)
        redrawActiveRegion(true, false);
    else
        redrawActiveRegion(true, true);
    */
    bufferX = x;
    bufferY = y;
    redrawActiveRegion(true, false);
}

function redrawActiveRegion(clear, clip)
{
    
    if (clip == true)
    {
        // If there are no queued clipping areas, nothing is to be done
        if (clipStack.length == 0)
            return false;
        
        // Push context
        bufferCtx.save();
        
        // Bigin definition of new clipping path
        bufferCtx.beginPath();
        
        while (clipStack.length != 0)
        {
            var obj = clipStack.pop();
            bufferCtx.rect(obj.px - buffx, obj.py - buffy, obj.w, obj.h);
        }
        
        // Clip the area of relevant changes
        bufferCtx.clip();
    }
    
    if (clear) bufferCtx.clearRect(0, 0, bufferWidth, bufferHeight);
    
    var d = activeRegion.data;
    var px, py, obj;
    for (var i = 0; i < d.length; i++)
    {
        obj = d[i];
        
        
        // Draw object
        bufferCtx.drawImage(obj.tile.img, px, py);
        
        // Draw cursor selection
        if (obj.selected == true)
            bufferCtx.drawImage(sprites[mouseOverSelection].img, px, py);
        
        // Draw lighter secondard selection
        if (obj.secondary_selection == true)
        {
            var s = bufferCtx.globalAlpha;
            bufferCtx.globalAlpha = secondarySelectionAlpha;
            bufferCtx.drawImage(sprites[secondarySelectionSprite].img, px, py);
            bufferCtx.globalAlpha = s;
        }
        
        // Draw shadow
        if (obj.shadow != 0)
        {
            var s = bufferCtx.globalAlpha;
            bufferCtx.globalAlpha = obj.shadow;
            bufferCtx.drawImage(sprites[shadowMaskTile].img, px, py);
            bufferCtx.globalAlpha = s;
        }
    }
    
    // Get rid of the previous clipping path
    if (clip == true) bufferCtx.restore();
    
    // empty clip stack
    clipStack = [];
    
    // Mark the buffer as dirty for double buffering.
    bufferDirty = true;
    
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
