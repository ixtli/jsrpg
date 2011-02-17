// Convienience engine constants
const DIR_CLOSER = 0;
const DIR_LEFT = 1;
const DIR_FURTHER = 2;
const DIR_RIGHT = 3;

function GameObject()
{
    this.name = null;
    
    // Animate!
    this.animations = [];
    this.currentAnimation = -1;
    this.lastUpdate = -1;
    this.animationIndex = -1;
    
    this.tile = null;
    this.stats = null;
    this.facing = DIR_CLOSER;
    
    this.face = charFace;
    this.setTile = charSetTile;
    
    this.init = function () {
        
    }
    
    this.init();
}

function charSetTile(tile)
{
    if (tile == null) return false;
    if (tile.character != null) return false;
    
    tile.character = this;
    this.tile = tile;
}

function charFace()
{
    
}



