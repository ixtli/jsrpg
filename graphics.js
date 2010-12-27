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

// Sprites
var tiles = [];

function pixelProjection(x, y, z)
{
    var px, py;
    
    px = (viewWidth >> 1) - (tileWidth >> 1);
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

function redrawMap(clear, clip)
{
    // Do not draw individual clipping regions while the view is scrolling
    // because the entire thing is going to be updated each frame
    if (clip == true && viewportIsScrolling == true)
        return;
    
    if (clip == true)
    {
        // Push context
        bufferCtx.save();
        
        // Bigin definition of new clipping path
        bufferCtx.beginPath();
        
        while (clipStack.length != 0)
        {
            var obj = clipStack.pop();
            bufferCtx.rect(obj[0], obj[1], obj[2], obj[3]);
        }
        
        // Clip the area of relevant changes
        bufferCtx.clip();
    }
    
    if (clear) bufferCtx.clearRect(0, 0, viewWidth, viewHeight);
    
    var d = viewableMap.data;
    var px, py;
    for (var i = 0; i < d.length; i++)
    {
        px = d[i].px - viewX;
        py = d[i].py - viewY;
        
        // Don't bother if it doesn't encroach on the viewport
        if (py + tileWidth < 0 || py > viewHeight ||
            px + tileWidth < 0 || px > viewWidth)
            continue;
        
        // Draw tile
        bufferCtx.drawImage(d[i].tile, px, py);
        
        // Draw cursor selection
        if (d[i].selected == true) bufferCtx.drawImage(selection, px, py);
        
        // Draw lighter secondard selection
        if (d[i].secondary_selection == true)
        {
            var s = bufferCtx.globalAlpha;
            bufferCtx.globalAlpha = secondarySelectionAlpha;
            bufferCtx.drawImage(selection, px, py);
            bufferCtx.globalAlpha = s;
        }
        
        // Draw shadow
        if (d[i].shadow != 0)
        {
            var s = bufferCtx.globalAlpha;
            bufferCtx.globalAlpha = d[i].shadow;
            bufferCtx.drawImage(shadow, px, py);
            bufferCtx.globalAlpha = s;
        }
    }
    
    // Get rid of the previous clipping path
    if (clip == true) bufferCtx.restore();
    
    // If viewport is currently scrolling, dump all the clipping paths because
    // they've just be redrawn
    if (viewportIsScrolling == true)
        clipStack = [];
    
    // Mark the buffer as dirty for double buffering.
    bufferDirty = true;
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
    var c = $('<canvas>')[0];
    c.width = tileWidth;
    c.height = tileHeight + (tileHeight >> 1) + tileBorder;
    
    // Assemble sprite
    var ctx = c.getContext('2d');
    // Draw a red border to see if there are any gaps anywhere.
    if (tileBorderDebug)
    {
        ctx.fillStyle = "rgba(255,0,0,0.25)";
        ctx.fillRect(0,0,viewWidth, viewHeight);
    }
    // Left wall
    ctx.drawImage(dark_wall, 0, (tileHeight >> 1) + 1);
    // Right wall
    ctx.drawImage(dark_wall_right, tileWidth >> 1, (tileHeight >> 1)+1);
    // Tile top
    ctx.drawImage(grass, 0, 0);
    
    // Set up the mapSprites data structure
    tiles.push(c);
}
