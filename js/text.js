const text_styles = ["black", "red", "green", "blue", "white"];
const text_token = "^";

function Ticker (canvas)
{
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.hidden = false;
    this.message = "";
    
    // Metrics
    this.typeSize = 14;
    this.leftPadding = 8;
    this.border = 3;
    
    return this.init();
}

Ticker.prototype = {
    
    init: function ()
    {
        this.setHeight(this.typeSize + (this.border << 1));
        
        return true;
    },
    
    setMessage: function (string)
    {
        var msgCanvas = this.canvas;
        var msgCtx = this.context;
        var size = this.typeSize;
        
        // Compute the y location to start from
        var msgy = (this.height - size) >> 1;
        
        // Add 1 or 2 here because we're using ideographic baseline in order
        // to support chinese characters
        msgy += size + 1;
        
        // Draw the message
        msgCtx.clearRect(0,0, this.width, this.height);
        msgCtx.fillStyle = 'rgba(0,0,0,1)';
        msgCtx.globalAlpha = .5;
        msgCtx.fillRect(0,0, this.width, this.height);
        msgCtx.globalAlpha = 1;
        msgCtx.font = "bold " + size + "px sans-serif";
        msgCtx.textBaseline = "ideographic";
        msgCtx.fillStyle = 'rgba(255,255,255,.9)';
        msgCtx.strokeStyle = 'rgba(0,0,0,.5)';
        msgCtx.strokeText(string, this.leftPadding, msgy);
        msgCtx.fillText(string, this.leftPadding, msgy);
        
        return true;
    },
    
    setHeight: function (height)
    {
        if (height < 1) return false;
        this.canvas.height = height;
        this.height = this.canvas.height;
        return true;
    },
    
    
};

// Generic function for drawing an escaped string to a canvas
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
    
    return true;
}

