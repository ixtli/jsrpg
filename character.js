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
    this.px = -1;
    this.py = -1;
    this.px_offset = 0;
    this.py_offset = 0;
    this.px_step = 0;
    this.py_step = 0;
    
    this.isAnimating = false;
    
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
            map.updateBuffer(true, this.px, this.py, this.w, this.h);
        }
        
        tile.addObject(this);
        this.tile = tile;
        this.project();
        map.updateBuffer(true, this.px, this.py, this.w, this.h);
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
        
        addObjectToBeAnimated(this);
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
        // Has the previous move finished yet?
        if (this.target_tile != null) return false;
        
        var tile = this.tile;
        var closer = false;
        switch (this.facing)
        {
            case DIR_CLOSER:
            this.target_tile = map.snap(tile.x, tile.y, tile.z + 1, true);
            closer = true;
            break;
            
            case DIR_LEFT:
            this.target_tile = map.snap(tile.x - 1, tile.y, tile.z, true);
            break;
            
            case DIR_RIGHT:
            this.target_tile = map.snap(tile.x + 1, tile.y, tile.z, true);
            closer = true;
            break;
            
            case DIR_FURTHER:
            this.target_tile = map.snap(tile.x, tile.y, tile.z - 1, true);
            break;
            
            default:
            break;
        }
        
        if (this.target_tile == null) return false;
        
        if (animate == false)
        {
            this.setTile(this.target_tile);
            this.target_tile = null;
            return true;
        }
        
        return true;
    },
    
    finishedAnimating: function ()
    {
        
    }
    
};

