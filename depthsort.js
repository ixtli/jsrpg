function DSAObject(tile, x, y, z)
{
    // Member values
    this.tile = tile;
    this.w = this.tile.width;
    this.h = this.tile.height;
    this.x = x;
    this.y = y;
    this.z = z;
    
    this.px = 0;
    this.py = 0;
    
    // Member functions
    this.genPixelValues = genPixelValues;
    
    // Initial setup of object
    // Generate absolute pixel locations
    this.genPixelValues();
    
    // Always return true
    return true;
}

function genPixelValues()
{
    // generate the px and py values for an object based on x, y, and z
    var x = (canvas.width >> 1) - (tileWidth >> 1);
    var y = 0;
    
    x += this.x * tileHeight;
    y += this.x * (tileHeight >> 1);
    
    x -= this.z * tileHeight;
    y += this.z * (tileHeight >> 1);
    
    y -= this.y * 17;
    
    this.px = x;
    this.py = y;
}

function DepthSortedArray()
{
    // Member values
    this.data = [];
    this.maxz = 0;
    this.maxx = 0;
    this.maxy = 0;
    
    // Member functions
    this.insert = DSAInsert;
    this.clip = DSAClip;
    this.cull = DSACull;
    
    // Always return true from constructors
    return true;
}

function DSAClip(minx, miny, maxx, maxy)
{
    var ret = new DepthSortedArray();
    var d = this.data;
    
    for (var i = 0; i < this.data.length; i++)
    {
        // Omit everything not in our bounding box
        if (d[i].px + d[i].w > minx && d[i].py + d[i].h > miny &&
            d[i].px < maxx && d[i].py < maxy )
        {
            ret.data.push(d[i]);
        }
    }
    
    return ret;
}

function DSACull() {
    
}

function DSAInsert(tile, x, y, z) {
    
    var object = new DSAObject(tile, x, y, z);
    
    // Initial case
    if (this.data.length == 0)
    {
        this.data.push(object);
        return;
    }
    
    // Insert it into the map array where it needs to go.
    // lowest z value first, lowest x, then lowest y
    var index = 0;
    var zstart = 0;
    // sort z values
    for (; index < this.data.length; index++)
    {
        if (this.data[index].z > object.z)
            break;
        
        // If this z is <= than object.z and it's different from the preivous
        // z value, it's a new zset
        if (this.data[zstart].z != this.data[index].z)
            zstart = index;
    }
    
    // Does this z value exist in this.data?  If it does, sort by x
    if (this.data[zstart].z == object.z)
    {
        index = zstart;
        var xstart = index;
        for (; index < this.data.length; index++)
        {
            // stay in this zset
            if (this.data[index].z != object.z)
                break;
            
            if (this.data[index].x > object.x)
                break;
            
            if (this.data[xstart].x != this.data[index].x)
                xstart = index;
        }
        
        // Does this x value exist in this zset yet?  If so, sort by y
        if (this.data[xstart].x == object.x)
        {
            index = xstart;
            for (; index < this.data.length; index++)
            {
                // stay in this zset and xset
                if (this.data[index].z != object.z ||
                    this.data[index].x != object.x)
                    break;
                
                if (this.data[index].y > object.y)
                    break;
            }
            
            // this xset has increased in length
            
        } else {
            // This is a new xval for this zset
        }
        
        // zset has increased in length
        
    } else {
        // This is a new zval
    }
    
    // Alert on duplicates
    
    // Insert into data array
    this.data.splice(index, 0, object);
    
    // keep track of maximum x, y, z values
    if (x > self.maxx) self.maxx = x;
    if (y > self.maxy) self.maxy = y;
    if (z > self.maxz) self.maxz = z;
    
    return index;
}