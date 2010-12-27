// editor-specific globals
var tileEditorCanvas = null;
var tileEditorCtx = null;

function tileEditorInit()
{
    tileEditorCanvas = $('#editor')[0];
    tileEditorCtx = tileEditorCanvas.getContext('2d');
    
    if (focussed != null) tileEditorUpdate();
}

function tileEditorUpdate()
{
    var height = tileEditorCanvas.height;
    var width = tileEditorCanvas.width;
    var midx = (width >> 1) - tileHeight;
    var midy = (height >> 1) - tileHeight;
    
    tileEditorCtx.clearRect(0,0,width, height);
    tileEditorCtx.fillStyle = 'rgba(100,0,0,.05)';
    tileEditorCtx.fillRect(0,0,width, height);
    tileEditorCtx.drawImage(focussed.tile, midx, midy);
}