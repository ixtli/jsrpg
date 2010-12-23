function DSAObject(tile, x, y, z)
{
    // Member values
    this.x = x;
    this.y = y;
    this.z = z;
    
    // Drawing-related members
    this.px = 0;
    this.py = 0;
    
    // depth sort array helper members
    this.abs_index = -1;
    this.container_array = null;
    
    // graphics related members
    this.tile = tile;
    this.w = this.tile.width;
    this.h = this.tile.height;
    this.shadow = 0;
    this.selected = false;
    
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
    
    this.clipx = 0;
    this.clipy = 0;
    this.clip_width = 0;
    this.clip_height = 0;
    this.super_array = null;
    
    this.z_sets = [];
    
    // Member functions
    this.insert = DSAInsert;
    this.clip = DSAClip;
    this.cull = DSACull;
    this.selectObject = DSASelectObject;
    this.insertAbove = DSAInsertAbove;
    this.castShadow = DSACastShadow;
    this.deleteIndex = DSADeleteObjectAtIndex;
    this.findObject = DSAFindObject;
    this.lowestObject = DSAFindLowestObject;
    
    // Always return true from constructors
    return true;
}

function DSAFindLowestObject(z, x)
{
    // This method returns the index of the object with the
    // lowest y value at (x, z)
    var a = this;
    if (a.super_array)
        a = this.super_array;
    
    if (a.z_sets[z] == -1)
        return null;
    
    // Get the end of the current zset
    var max;
    if (z == a.maxz)
        max = a.data.length;
    else
        max = a.z_sets[z + 1] - 1;
        
    // Binary search
    var min = a.z_sets[z];
    var mid;
    do {
        mid = min + ((max - min) >> 1);
        if (x > a.data[mid].x )
            min = mid + 1;
        else
            max = mid - 1;
    } while (a.data[mid].x != x && min <= max);
    
    // Success
    // Find the lowest block in this xset
    if (a.data[mid].x == x)
    {
        while (mid > 0)
        {
            if (a.data[mid - 1].z != z || a.data[mid - 1].x != x)
                break;
            mid--;
        }
        return mid;
    }
    
    // Failure
    return null;
}

function DSAFindObject(obj)
{
    // This method returns the the index of the object in the SUPER ARRAY only
    // returns null of not present
    
    var a = this;
    if (a.super_array)
        a = this.super_array;
    
    // Get the end of the current zset
    var max;
    if (obj.z == a.maxz)
        max = a.data.length;
    else
        max = a.z_sets[obj.z + 1];
    
    // The beginning of the zset we're looking in
    var min = a.z_sets[obj.z];
    
    // Binary search
    var mid;
    do {
        mid = min + ((max - min) >> 1);
        if (obj.x > a.data[mid].x )
            min = mid + 1;
        else if (obj.x < a.data[mid].x)
            max = mid - 1;
        if (obj.y > a.data[mid].y )
            min = mid + 1;
        else if (obj.y < a.data[mid].y)
            max = mid - 1;
    } while ( a.data[mid] === obj || min > max);
    
    if (a.data[mid] === obj)
        return mid;
    
    return null;
}

function DSACastShadow(index)
{
    if (this.super_array != null)
        return;
    
    if (index == 0)
        return;
    
    var below = this.data[index - 1];
    
    if (below.x != this.data[index].x || below.z != this.data[index].z )
        return;
    
    // Don't cast a shadow on something directly below.
    if (below.y == this.data[index].y - 1)
        return;
    
    below.shadow = 1 - ((this.data[index].y - below.y) * shadowStep);
    
    if (below.shadow < 0)
        below.shadow = 0;
}

function DSADeleteObjectAtIndex(ind)
{
    var a = this, index = ind;
    if (this.super_array != null)
    {
        a = this.super_array;
        index = this.data[ind].abs_index;
    }
    
    // Figure out if there is a block spacially above us or not
    var above = null;
    if (index + 1 < a.data.length)
    {
        if (a.data[index + 1].x == a.data[index].x &&
            a.data[index + 1].z == a.data[index].z)
            above = a.data[index+1];
    }
    
    var deleted = a.data.splice(index, 1);
    
    // Handle shadow
    if (above != null)
    {
        a.castShadow(index);
    } else {
        // If nothing is above us, remove shadow
        if (index - 1 >= 0 && deleted.length > 0)
        {
            if (a.data[index - 1].x == deleted[0].x &&
                a.data[index - 1].z == deleted[0].z)
                a.data[index - 1].shadow = 0;
        }
    }
    
    // Maintain zsets The zset of this object has decreased in size
    // Reduce the size of all zsets above us
    for (var i = deleted.z + 1; i < a.z_sets.length; i++)
        a.z_sets[i] -= 1;
    
    // is deleted in the largest zset?
    if (deleted.z == a.z_sets.length)
    {
        // Did we just delete the last element of this zset?
        if (a.z_sets[deleted.z] == a.data.length)
        {
            a.z_sets[deleted.z] = -1;
            // trim the array
            do
            {
                if (a.z_sets[a.z_sets.length - 1] != -1)
                    break;
                    
                a.z_sets.pop();
            } while (a.z_sets.length > 0);
            
            // Keep track of maxz value
            a.maxz = a.z_sets.length - 1;
        }
    } else {
        if (a.z_sets[deleted.z] == a.z_sets[deleted.z + 1])
            a.z_sets[deleted.z] = -1;
    }
}

function DSAInsertAbove(ind, tile)
{
    // We should not insert into an array that is a clipped region of a
    // superset, because it would invalidate all the abs_index values
    
    var a = this, index = ind;
    if (this.super_array != null)
    {
        a = this.super_array;
        index = this.data[ind].abs_index;
    }
    
    var obj = a.data[index];
    
    // Make sure there's nothing above us already
    if (a.data.length > index + 1)
    {
        if (a.data[index+1].z == obj.z &&
            a.data[index+1].x == obj.x &&
            a.data[index+1].y == obj.y + 1)
            return;
    }
    
    var n = new DSAObject(tile, obj.x, obj.y + 1, obj.z);
    
    if (obj.shadow == 1)
    {
        obj.shadow = 0;
    } else if (obj.shadow != 0) {
        n.shadow = obj.shadow + shadowStep;
        obj.shadow = 0;
    }
    
    a.data.splice(index + 1, 0, n);
    a.data[index + 1].container_array = a;
    
    // zset has increased in length, so increase all following zset indicies
    for (var i = n.z + 1; i < a.z_sets.length ; i++)
        a.z_sets[i] += 1;
    
    a.castShadow(index);
}

function DSAInsertBelow(ind, tile)
{
    // We should not insert into an array that is a clipped region of a
    // superset, because it would invalidate all the abs_index values
    
    var a = this, index = ind;
    if (this.super_array != null)
    {
        a = this.super_array;
        index = this.data[ind].abs_index;
    }
    
    var obj = a.data[index];
    
    // Make sure there's nothing below us already
    if (index - 1 >= 0)
    {
        if (a.data[index-1].z == obj.z &&
            a.data[index-1].x == obj.x &&
            a.data[index-1].y == obj.y - 1)
            return;
    }
    
    var n = new DSAObject(tile, obj.x, obj.y - 1, obj.z);
    a.data.splice(index, 0, n);
    a.data[index].container_array = a;
    
    // zset has increased in length, so increase all following zset indicies
    for (var i = n.z + 1; i < a.z_sets.length ; i++)
        a.z_sets[i] += 1;
    
    a.castShadow(index - 1);
}

function DSASelectObject(x, y)
{
    // return the front-most tile at pixel position (x,y) in the current
    // viewport.
    for (var i = this.data.length - 1; i >=0; i--)
    {
        var obj = this.data[i];
        if (obj.px - viewX <= x && obj.py - viewY <= y &&
            obj.px - viewX + obj.w > x && obj.py - viewY + obj.h > y)
        {
            var dx = Math.floor(x - (obj.px - viewX));
            var dy = Math.floor(y - (obj.py - viewY));
            var pixeldata = obj.tile.getContext('2d').getImageData(dx,dy,1,1);
            if (pixeldata.data[3] > alphaSelectionThreshold) {
                return obj;
            }
        }
    }
    return null;
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
            ret.data.splice(ret.data.length,0,d[i]);
            ret.data[ret.data.length - 1].abs_index = i;
        }
    }
    
    // Save a bit of information
    ret.clipx = minx;
    ret.clipy = miny;
    ret.clip_height = maxy;
    ret.clip_width = maxx;
    
    ret.super_array = this;
    
    return ret;
}

function DSACull() {
    
}

function DSAInsert(tile, x, y, z) {
    
    var object = new DSAObject(tile, x, y, z);
    
    // Initial case
    if (this.data.length == 0)
    {
        this.maxz = z;
        this.maxy = y;
        this.maxx = x;
        
        for (var i = 0; i < z - 1; i++)
            this.z_sets.push(-1);
        
        // Push the index of the new set
        this.z_sets.push(0);
        
        // Push the actual object
        this.data.push(object);
        
        return;
    }
    
    // We want to keep track of the start indexes of z sets, so treat
    // the following as a special condition
    if (z > this.maxz)
    {
        // Make blank zsets until we get to the new one
        for (var i = this.maxz; i < z - 1; i++)
            this.z_sets.push(-1);
        
        // Push the index of the new set
        this.z_sets.push(this.data.push(object) - 1);
        
        // Update maxz value
        this.maxz = z;
        
        return;
    }
    
    // Insert it into the map array where it needs to go.
    // lowest z value first, lowest x, then lowest y
    var index = 0;
    
    // Does this z value exist in this.data?  If it does, sort by x
    if (this.z_sets[object.z] > -1)
    {
        index = this.z_sets[object.z];
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
            // this xset has increased in length
        }
        
        // zset has increased in length, so increase all following zset indicies
        for (var i = z + 1; i < this.z_sets.length ; i++)
            this.z_sets[i] += 1;
        
    } else {
        // First element in a zset
        if (z == this.maxz)
            // We're the first to insert into the biggest zset
            index = this.data.push(object) - 1;
        else
            // We want to insert before the beginning of the next-biggest zset
            index = this.z_sets[z+1];
        
        // This is a new zval, so note its index in the z_sets[]
        this.z_sets[z] = index;
        
        // zset has increased in length, so increase all following zset indicies
        for (var i = z + 1; i < this.z_sets.length; i++)
            this.z_sets[i] += 1;
    }
    
    // Alert on duplicates
    
    // Insert into data array
    this.data.splice(index, 0, object);
    this.data[index].container_array = this;
    
    // keep track of maximum x, y, z values
    if (x > this.maxx) this.maxx = x;
    if (y > this.maxy) this.maxy = y;
    
    return index;
}