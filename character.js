// Convienience engine constants
const DIR_CLOSER = 0;
const DIR_LEFT = 1;
const DIR_FURTHER = 2;
const DIR_RIGHT = 3;

function GameObject(name, anims)
{
    // Meta members
    this.name = name;
    
    // Graphics-related members
    this.animations = anims;
    this.currentAnimation = null;
    this.animIndex = 0;
    this.lastUpdate = 0;
    this.w = 0;
    this.h = 0;
    this.img = null;
    this.px = 0;
    this.py = 0;
    this.moveSpeed = 3;
    this.notifyOnAnimationCompletion = false;
    this.isAnimating = false;
    
    this.slope = null;
    this.speed = null;
    this.target_px = null;
    this.target_py = null;
    this.moving = false;
    
    // Associated map tile
    this.tile = null;
    
    // Game system mebers
    this.stats = null;
    this.facing = DIR_RIGHT;
    
    // Private members
    this.target_tile = null;
}

GameObject.prototype = {
    
    face: function (direction)
    {
        this.facing = direction;
    },
    
    setTile: function (tile)
    {
        if (tile == null) return false;
        
        if (this.tile != null)
        {
            var t = this.tile;
            t.removeObject(this);
            map.updateBuffer(true, Math.floor(this.px), Math.floor(this.py),
                Math.ceil(this.w), Math.ceil(this.h));
            if (t === focussed) tileEditorUpdate();
        }
        
        tile.addObject(this);
        this.tile = tile;
        this.project();
        
        map.updateBuffer(true, this.px, this.py, this.w, this.h);
        
        if (tile === focussed) tileEditorUpdate();
    },
    
    setAnimation: function (name, index)
    {
        var tmp = this.animations[name][index];
        
        if (tmp == null) return false;
        this.currentAnimation = tmp;
        this.project();
        this.img = this.currentAnimation.array[this.animIndex];
    },
    
    animate: function ()
    {
        if (this.isAnimating == true) return false;
        
        addObjectToBeAnimated(this, true);
        this.isAnimating = true;
        
        return true;
    },
    
    stopAnimating: function ()
    {
        if (this.isAnimating == false) return false;
        
        stopAnimatingObject(this);
        this.isAnimating = false;
        
        return true;
    },
    
    project: function ()
    {
        if (this.tile == null || this.currentAnimation == null) return;
        
        this.w = this.currentAnimation.width;
        this.h = this.currentAnimation.height;
        
        this.px = this.tile.px + (tileWidth >> 1) - (this.w >> 1);
        this.px += this.currentAnimation.xOffset;
        this.py = this.tile.py + this.currentAnimation.yOffset;
    },
    
    tileWasDeleted: function ()
    {
        this.stopAnimating();
    },
    
    moveForward: function (animate)
    {
        // Move in the direction the object is facing.
        
        // Has the previous move finished yet?
        if (this.target_tile != null) return false;
        
        var target = null;
        var tile = this.tile;
        var closer = false;
        switch (this.facing)
        {
            case DIR_CLOSER:
            target = map.snap(tile.x, tile.y, tile.z + 1, true);
            closer = true;
            break;
            
            case DIR_LEFT:
            target = map.snap(tile.x - 1, tile.y, tile.z, true);
            break;
            
            case DIR_RIGHT:
            target = map.snap(tile.x + 1, tile.y, tile.z, true);
            closer = true;
            break;
            
            case DIR_FURTHER:
            target = map.snap(tile.x, tile.y, tile.z - 1, true);
            break;
            
            default:
            break;
        }
        
        if (target == null) return false;
        
        if (animate == false)
        {
            this.setTile(target);
            return true;
        }
        
        this.target_px = target.px + (tileWidth >> 1) - (this.w >> 1);
        this.target_px += this.currentAnimation.xOffset;
        this.target_py = target.py + this.currentAnimation.yOffset;
        this.slope = (this.px - target.px) / (this.py - target.py);
        
        target.addObject(this);
        this.target_tile = target;
        
        this.moving = true;
        
        //bufferCtx.clearRect(0,0,bufferWidth, bufferHeight);
        //canvasContext.clearRect(0,0,viewWidth, viewHeight);
        startMovingObject(this);
        
        return true;
    },
    
    finishedMoving: function ()
    {
        // The px,py has reached the target px,py
        this.setTile(this.target_tile);
        this.target_tile = null;
        this.moving = false;
    },
    
    finishedAnimating: function (time)
    {
        // If this function returns false, the first frame will not be displayed
        // This is useful if the animation should only play once.
        
        this.stopAnimating();
        return false;
    }
    
};

