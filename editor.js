// editor-specific globals
var tileEditorCanvas = null;
var tileEditorCtx = null;
var drawBackground = false;

var tileEditorMsg = ["No tile selected."
];

function tileEditorInit()
{
    tileEditorCanvas = $('#editor')[0];
    tileEditorCtx = tileEditorCanvas.getContext('2d');
    
    tileEditorCtx.font = "bold 14px sans-serif";
    bindTileEditorEventHandlers();
    tileEditorUpdate();
}

function bindTileEditorEventHandlers()
{
    $('#tebg').bind('click', function () {
        drawBackground = drawBackground ? false : true;
        tileEditorUpdate();
    });
    
    $('#tindex').slider({max: sprites.length-1,slide: tileIndexInputDidChange});
}

function tileIndexInputDidChange(event, ui)
{
    var val = ui.value;
    var selectedSprite = sprites[val];
    if (focussed != null)
    {
        focussed.tile = selectedSprite;
        redrawObject(focussed);
        redrawMap(true, true);
        tileEditorUpdate();
    }
    
    if (extendedSelection.length > 0)
    {
        var t;
        for (var i = 0; i < extendedSelection.length; i++)
        {
            t = extendedSelection[i];
            t.tile = selectedSprite;
            redrawObject(t);
        }
    }
}

function tileEditorUpdate()
{
    var height = tileEditorCanvas.height;
    var width = tileEditorCanvas.width;
    var midx = (width >> 1) - tileHeight;
    var midy = (height >> 1) - tileHeight;
    
    tileEditorCtx.clearRect(0,0,width, height);
    
    if (drawBackground)
    {
        tileEditorCtx.fillStyle = 'rgba(100,0,0,.05)';
        tileEditorCtx.fillRect(0,0,width, height);
    }
    
    // Draw bottom message
    tileEditorCtx.fillStyle = 'rgba(0,0,0,.75)';
    if (focussed != null) {
        
        tileEditorCtx.drawImage(focussed.tile.img, midx, midy);
        var msg = "("+focussed.x +","+ focussed.y+","+focussed.z+")";
        tileEditorCtx.fillText(msg, 5, height - 6);
        tileEditorCtx.fillText(focussed.tile.name, 5, height - 23);
        $('#tindex').slider("value", focussed.tile.i);
    } else {
        tileEditorCtx.fillText(tileEditorMsg[0], 5, height - 6);
    }
}