// Convienience engine constants
const DIR_CLOSER = 0;
const DIR_LEFT = 1;
const DIR_FURTHER = 2;
const DIR_RIGHT = 3;

// Associated ui windows
var charWin = null;

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
    this.notifyOnAnimationCompletion = false;
    this.isAnimating = false;
    this.animReverse = false; // Is it playing backwards at the moment?
    
    // Movement state members
    this.slope = 0;
    this.speed = 0;
    this.moveSpeed = 3;
    this.target_px = 0;
    this.target_py = 0;
    this.moving = false;
    this.target_tile = null;
    this.path = null;
    this.pathIndex = 0;
    
    // Associated map tile
    this.tile = null;
    
    // Game system mebers
    this.stats = null;
    this.facing = DIR_RIGHT;
    
    return this.init();
}

GameObject.prototype = {
    
    init: function ()
    {
        this.setAnimation('idle');
        this.animate();
        
        return true;
    },
    
    gotFocus: function ()
    {
        
    },
    
    lostFocus: function ()
    {
        
    },
    
    face: function (direction)
    {
        if (this.moving == true) return false;
        if (this.facing == direction) return true;
        
        this.facing = direction;
        this.setAnimation('idle');
        map.updateBuffer(true, this.px, this.py, this.w, this.h);
        this.lastUpdate = new Date();
        
        return true;
    },
    
    setTile: function (tile)
    {
        if (tile == null) return false;
        
        if (this.tile != null)
        {
            var t = this.tile;
            t.removeObject(this);
            map.updateBuffer(true, this.px, this.py, this.w, this.h);
            if (t === focussed) tileEditorUpdate();
        }
        
        tile.addObject(this);
        this.tile = tile;
        
        var ret = this.project(this.tile);
        this.px = ret.px;
        this.py = ret.py;
        
        map.updateBuffer(true, this.px, this.py, this.w, this.h);
        
        if (tile === focussed) tileEditorUpdate();
    },
    
    setAnimation: function (name)
    {
        var tmp = this.animations[name][this.facing];
        
        if (tmp == null) return false;
        this.currentAnimation = tmp;
        
        this.w = this.currentAnimation.width;
        this.h = this.currentAnimation.height;
        this.animIndex = this.currentAnimation.start;
        
        var ret = this.project(this.tile);
        this.px = ret.px;
        this.py = ret.py;
        
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
    
    project: function (tile)
    {
        var ret = {px: 0, py: 0};
        
        if (tile != null)
        {
            ret.px = tile.px;
            ret.py = tile.py;
        }
        
        // Center the image based on tile width
        ret.px += (tileWidth >> 1) - (this.w >> 1);
        ret.px += this.currentAnimation.xOffset;
        
        ret.py += this.currentAnimation.yOffset;
        
        return ret;
    },
    
    tileWasDeleted: function ()
    {
        this.stopAnimating();
    },
    
    moveForward: function (animate)
    {
        // Move in the direction the object is facing.
        
        // Has the previous move finished yet?
        if (this.target_tile != null || this.moving == true) return false;
        
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
        
        var ret = this.project(target);
        this.target_px = ret.px;
        this.target_py = ret.py;
        this.slope = (ret.py - this.py) / (ret.px - this.px);
        
        target.addObject(this);
        this.target_tile = target;
        
        this.moving = true;
        startMovingObject(this);
        
        return true;
    },
    
    finishedMoving: function ()
    {
        // The px,py has reached the target px,py
        
        if (this.target_tile != null)
        {
            this.tile.removeObject(this);
            this.tile = this.target_tile;
            var ret = this.project(this.tile);
            this.px = ret.px;
            this.py = ret.py;
            this.target_tile = null;
        }
        
        this.moving = false;
        
        if (this.path != null)
            this.moveToNextPathTile();
    },
    
    finishedAnimating: function (time)
    {
        // If this function returns false, the first frame will not be displayed
        // This is useful if the animation should only play once.
        
        this.setAnimation('idle');
        return false;
    },
    
    startMovingOnPath: function (path, start)
    {
        if (this.path != null) return false;
        
        // Remember that paths go from back to front because of how A*
        // discovers them.
        this.pathIndex = path.length - 1;
        
        if (this.moving == true)
        {
            // Queue up the path to start right after moving is complexted.
            this.path = path;
            return true;
        }
        
        // Are we at the first tile?
        if (!(path[this.pathIndex] === this.tile))
            setTile(path[this.pathIndex]);
        
        this.path = path;
        
        if (start == true)
            this.moveToNextPathTile();
        
        return true;
    },
    
    moveToNextPathTile: function ()
    {
        var cur = this.tile;
        
        // Error condition check
        if (this.moving == true) return false;
        
        // Remember that the path is backwards because of how A* returns results
        var index = --this.pathIndex;
        if (index < 0)
        {
            this.path = null;
            return false;
        }
        
        var next = this.path[index];
        
        // Moving left
        if (cur.x > next.x)
            this.face(DIR_LEFT);
        // Moving right
        else if (cur.x < next.x)
            this.face(DIR_RIGHT);
        // Moving further
        else if (cur.z > next.z)
            this.face(DIR_FURTHER);
        // Moving closer
        else
            this.face(DIR_CLOSER);
        
        this.moveForward(true);
        
        return true;
    },
    
    cancelMovementPath: function ()
    {
        if (this.path == null) return false;
        
        this.path = null;
        
        return true;
    },
    
};

