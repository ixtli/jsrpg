// editor-specific globals
var editorCanvas = null;
var editorCtx = null;

function editorInit()
{
    editorCanvas = $('#editor')[0];
    editorCtx = editorCanvas.getContext('2d');
    
    editorCtx.fillStyle = 'rgba(0,0,0,1)';
    editorCtx.fillRect(0,0,editorCanvas.width,editorCanvas.height);
}