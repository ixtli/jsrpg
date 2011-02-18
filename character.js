// Convienience engine constants
const DIR_CLOSER = 0;
const DIR_LEFT = 1;
const DIR_FURTHER = 2;
const DIR_RIGHT = 3;

function GameObject(name, anims)
{
    this.name = name;
    
    // Animate!
    this.animations = anims;
    this.currentAnimation = null;
    
    this.img = null;
    this.stats = null;
    this.facing = DIR_CLOSER;
    this.px = -1;
    this.py = -1;
    this.px_offset = 0;
    this.py_offset = 0;
    
    this.tile = null;
    
    this.interval = -1;
    
    this.face = function (direction) {this.facing = direction};
    
    this.setTile = function (tile)
    {
        if (tile == null) return false;
        
        if (this.tile != null)
            this.tile.removeObject(this);
        
        tile.addObject(this);
        this.tile = tile;
        this.project();
    };
    
    this.setAnimation = function (name, index)
    {
        var tmp = this.animations[name][index];
        
        if (tmp == null) return false;
        this.currentAnimation = tmp;
        this.project();
        this.img = this.currentAnimation.array[animIndex];
    };
    
    this.project = function () {
        if (this.tile == null || this.currentAnimation == null) return;
        
        w = this.currentAnimation.width;
        h = this.currentAnimation.height;
        
        this.px = this.tile.px + (tileWidth >> 1) - (w >> 1);
        this.px += this.px_offset + this.currentAnimation.xOffset;
        this.py = this.tile.py + this.py_offset + this.currentAnimation.yOffset;
    };
    
    var instance = null;
    var animIndex = 0;
    var w = 0;
    var h = 0;
    function drawObject() {
        var anim = instance.currentAnimation;
        if (++animIndex >= anim.start + anim.count)
            animIndex = anim.start;
        instance.img = anim.array[animIndex];
        map.updateBuffer(true, instance.px, instance.py, w, h);
        return true;
    };
    
    this.animate = function () {
        if (this.currentAnimation == null || this.img == null) return false;
        instance = this;
        this.interval=setInterval(drawObject, 1000/this.currentAnimation.quantum);
        return true;
    };
}
