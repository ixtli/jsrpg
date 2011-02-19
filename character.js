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
    
    // Associated map tile
    this.tile = null;
    
    // Game system mebers
    this.stats = null;
    this.facing = DIR_CLOSER;
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
            this.tile.removeObject(this);
        
        tile.addObject(this);
        this.tile = tile;
        this.project();
    },
    
    setAnimation: function (name, index)
    {
        var tmp = this.animations[name][index];
        
        if (tmp == null) return false;
        this.currentAnimation = tmp;
        this.project();
        this.img = this.currentAnimation.array[this.animIndex];
    },
    
    project: function ()
    {
        if (this.tile == null || this.currentAnimation == null) return;
        
        this.w = this.currentAnimation.width;
        this.h = this.currentAnimation.height;
        
        this.px = this.tile.px + (tileWidth >> 1) - (this.w >> 1);
        this.px += this.px_offset + this.currentAnimation.xOffset;
        this.py = this.tile.py + this.py_offset + this.currentAnimation.yOffset;
    },
    
    tileWasDeleted: function ()
    {
        stopAnimatingObject(this);
    },
    
};

