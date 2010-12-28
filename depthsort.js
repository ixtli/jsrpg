function DSAZGeometryObject(z)
{
    this.minx = null;
    this.maxx = null;
    this.miny = null;
    this.maxy = null;
    this.z = z;
    
    this.points = [];
    
    this.updatePixelProjection = DSAZGOProject;
    
    return true;
}

function DSAZGOProject()
{
    
    this.points = [];
    
    var r = pixelProjection(this.minx, this.miny, this.z);
    this.points.push({x: r.px, y: r.py});
    
    r = pixelProjection(this.maxx, this.miny, this.z);
    this.points.push({x: r.px, y: r.py});
    
    r = pixelProjection(this.maxx, this.maxy, this.z);
    this.points.push({x: r.px, y: r.py - tileHeight});
    
    r = pixelProjection(this.minx, this.maxy, this.z);
    this.points.push({x: r.px, y: r.py - tileHeight});
}

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
    this.container_array = null;
    
    // graphics related members
    this.tile = tile;
    this.w = this.tile.w;
    this.h = this.tile.h;
    this.shadow = 0;
    this.selected = false;
    this.secondary_selection = false;
    
    // this needs to be set to see if we can count this object as a 'wall'
    // when doing our modified backface culling
    this.transparent = false;
    
    // Member functions
    this.genPixelValues = function () {
        var r = pixelProjection(this.x, this.y, this.z);
        this.px = r.px;
        this.py = r.py;
    };
    
    // Initial setup of object
    // Generate absolute pixel locations
    this.genPixelValues();
    
    // Always return true
    return true;
}

function DepthSortedArray()
{
    // Member values
    this.data = [];
    this.maxz = 0;
    
    this.clipx = 0;
    this.clipy = 0;
    this.clip_width = 0;
    this.clip_height = 0;
    this.super_array = null;
    
    this.z_sets = [];
    this.z_geom = [];  // keep track of max and min x and y
    this.abs_indicies = [];
    
    // Member functions
    this.insert = DSAInsert;
    this.clip = DSAClip;
    this.cull = DSACull;
    this.selectObject = DSASelectObject;
    this.insertAboveObject = DSAInsertAboveObject;
    this.insertAboveIndex = DSAInsertAboveIndex;
    this.insertBelowObject = DSAInsertBelowObject;
    this.insertBelowIndex = DSAInsertBelowIndex;
    this.castShadow = DSACastShadow;
    this.deleteObject = DSADeleteObject;
    this.deleteIndex = DSADeleteIndex;
    this.findIndexForObjectAt = DSAFindIndexForObjectAt;
    this.findIndexForObject = DSAFindIndexForObject;
    this.indexOfLowestObject = DSAFindLowestObject;
    this.correctHeight = DSACorrectHeight;
    this.updatePlaneGeometry = DSAUpdatePlaneGeometry;
    
    // Debugging
    this.duplicateDetection = true;
    this.allowDuplicates = false;
    
    // Always return true from constructors
    return true;
}

function DSACorrectHeight(ind, height)
{
    // This method takes a height and the index of the tile with the lowest
    // height at this (z, x) value
    a = this;
    if (this.super_array)
        a = this.super_array;
    
    // Find the object with the lowest Y value that is closest to obj.y
    var index = ind;
    while (index + 1 < a.data.length)
    {
        // Stay in this x, z set
        if (a.data[index+1].x != a.data[index].x ||
            a.data[index+1].z != a.data[index].z)
            break;
        
        // Basically this will find EITHER the nearest tile below height
        // OR the nearest tile with a space above it IF there is a tile
        // at height.  This should be used to determine which way an object
        // goes if entering this (z,x) value at height
        if (a.data[index].y >= height &&
            a.data[index + 1].y > a.data[index].y + 1)
            break;
        
        index++;
    }
    
    return index;
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

function DSAFindIndexForObject(obj)
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
        max = a.z_sets[obj.z + 1] - 1;
    
    // Binary search for x
    var min = a.z_sets[obj.z];
    var mid;
    do {
        mid = min + ((max - min) >> 1);
        if (obj.x > a.data[mid].x )
            min = mid + 1;
        else
            max = mid - 1;
    } while (a.data[mid].x != obj.x && min <= max);
    
    // is the x value present?
    if (a.data[mid].x != obj.x)
        return null;
    
    // Search linearly on y for the value
    if (a.data[mid].y > obj.y)
    {
        // go down
        while (mid >= 0)
        {
            if (a.data[mid].x != obj.x || a.data[mid].z != obj.z)
                return null;
            
            if (a.data[mid].y == obj.y)
                break;
            
            mid--;
        }
    } else {
        // go up
        while (mid < a.data.length)
        {
            if (a.data[mid].x != obj.x || a.data[mid].z != obj.z)
                return null;
            
            if (a.data[mid].y == obj.y)
                break;
            
            mid++;
        }
    }
    
    // Is the y val correct?
    if (a.data[mid].y != obj.y)
        return null;
    
    // Success!
    return mid;
}

function DSAFindIndexForObjectAt(x, y, z)
{
    var temp = new DSAObject(null, x, y, z);
    return this.findIndexForObject(temp);
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

function DSADeleteObject(obj)
{
    var index = this.findIndexForObject(obj);
    return this.deleteIndex(index);
}

function DSADeleteIndex(index)
{
    var a = this;
    if (this.super_array != null)
        a = this.super_array;
    
    // Figure out if there is a block spacially above us or not
    var above = null;
    
    if (index + 1 < a.data.length)
    {
        if (a.data[index + 1].x == a.data[index].x &&
            a.data[index + 1].z == a.data[index].z)
            above = a.data[index+1];
    }
    
    var deleted = a.data.splice(index, 1)[0];
    
    // Handle shadow
    if (above != null)
    {
        a.castShadow(index);
    } else {
        // If nothing is above us, remove shadow
        if (index - 1 >= 0)
        {
            if (a.data[index - 1].x == deleted.x &&
                a.data[index - 1].z == deleted.z)
                a.data[index - 1].shadow = 0;
        }
    }
    
    // Maintain zsets The zset of this object has decreased in size
    // Reduce the size of all zsets above us
    for (var i = deleted.z + 1; i < a.z_sets.length; i++)
        a.z_sets[i] -= 1;
    
    // Were we the last object in this zset?
    if (a.z_sets[deleted.z] == a.z_sets[deleted.z + 1])
    {
        a.z_sets[deleted.z] = -1;
        
        // Since the last set is empty, trim all empty tail sets
        do
        {
            if (a.z_sets[a.z_sets.length - 1] != -1)
                break;
                
            a.z_sets.pop();
            a.z_geom.pop();
        } while (a.z_sets.length > 0);
        
        // Keep track of maxz value
        a.maxz = a.z_sets.length - 1;
    } else {
        // Since the set isn't empty, update the geom values
        // The x values are the easy part since z-planes are sorted by x val
        var max;
        if (deleted.z == this.maxz)
            max = a.data.length-1;
        else
            max = a.z_sets[deleted.z+1] - 1;
        
        a.z_geom[deleted.z].maxx = a.data[max].x;
        a.z_geom[deleted.z].minx = a.data[a.z_sets[deleted.z]].x;
        
        // Finding the highest yvalue requires scanning the entire zset
        if (deleted.y == a.z_geom[deleted.z].miny || 
            deleted.y == a.z_geom[deleted.z].maxy)
        {
            for (var i = a.z_sets[deleted.z]; i < max; i++)
            {
                if (a.data[i].y > a.z_geom[deleted.z].maxy)
                    a.z_geom[deleted.z].maxy = a.data[i].y;
                else if (a.data[i].y < a.z_geom[deleted.z].miny)
                    a.z_geom[deleted.z].miny = a.data[i].y;
            }
            
            a.z_geom[deleted.z].updatePixelProjection();
        }
    }
    
    return deleted;
}

function DSAInsertAboveObject(object, tile)
{
    var index = this.findIndexForObject(object);
    return this.insertAboveIndex(index, tile);
}

function DSAInsertAboveIndex(index, tile)
{
    // We should not insert into an array that is a clipped region of a
    // superset, because it would invalidate all the abs_indicies values
    
    var a = this;
    if (this.super_array != null)
        a = this.super_array;
    
    var obj = a.data[index];
    
    // Make sure there's nothing above us already
    if (a.data.length > index + 1)
    {
        if (a.data[index+1].z == obj.z &&
            a.data[index+1].x == obj.x &&
            a.data[index+1].y == obj.y + 1)
            return null;
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
    
    this.updatePlaneGeometry(n);
    
    a.castShadow(index);
    
    return n;
}

function DSAInsertBelowObject(object, tile)
{
    var index = this.findIndexForObject(object);
    return this.insertBelowIndex(index, tile);
}

function DSAInsertBelowIndex(index, tile)
{
    // We should not insert into an array that is a clipped region of a
    // superset, because it would invalidate all the abs_indicies
    
    var a = this;
    if (this.super_array != null)
        a = this.super_array;
    
    var obj = a.data[index];
    
    // Make sure there's nothing below us already
    if (index - 1 >= 0)
    {
        if (a.data[index-1].z == obj.z &&
            a.data[index-1].x == obj.x &&
            a.data[index-1].y == obj.y - 1)
            return null;
    }
    
    var n = new DSAObject(tile, obj.x, obj.y - 1, obj.z);
    a.data.splice(index, 0, n);
    a.data[index].container_array = a;
    
    // zset has increased in length, so increase all following zset indicies
    for (var i = n.z + 1; i < a.z_sets.length ; i++)
        a.z_sets[i] += 1;
    
    this.updatePlaneGeometry(n);
    
    // We might be the new first block in the zset
    if (index > 0)
    {
        if (a.data[index - 1].z != a.data[index].z )
            // we're the new first index in the zset
            a.z_sets[a.data[index].z] = index;
    }
    
    a.castShadow(index - 1);
    
    return n;
}

function DSASelectObject(x, y)
{
    // return the front-most tile at pixel position (x,y) in the current
    // viewport.
    for (var i = this.data.length - 1; i >=0; i--)
    {
        var obj = this.data[i];
        
        // Don't bother if it doesn't encroach on the viewport
        if ((obj.py - viewY) + tileWidth < 0 || (obj.py - viewY) > viewHeight ||
            (obj.px - viewX) + tileWidth < 0 || (obj.px - viewX) > viewWidth)
            continue;
        
        if (obj.px - viewX <= x && obj.py - viewY <= y &&
            obj.px - viewX + obj.w > x && obj.py - viewY + obj.h > y)
        {
            var dx = Math.floor(x - (obj.px - viewX));
            var dy = Math.floor(y - (obj.py - viewY));
            var pixeldata = obj.tile.img.getContext('2d').getImageData(dx,dy,1,1);
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
    var pr = 0;
    
    // Construct the rectangle representing our viewport
    var rect = {x:minx,y:miny,w:maxx,h:maxy};
    for (var z = 0; z < this.z_sets.length; z++)
    {
        if (this.z_sets[z] == -1)
            continue;
        
        var p = this.z_geom[z];
        
        // Broad phase clipping by treating the plane as a box
        if (p.points[3].y > rect.h || p.points[1].y < rect.y ||
            p.points[3].x > rect.w || p.points[1].x < rect.x)
            continue;
        
        // Do more detailed plane collision test by splitting the zplane
        // in to two triangles and testing whether or not they intersect
        // the viewport, represented as an AABB
        var col = triangleTest(rect, p.points[0], p.points[1], p.points[2]);
        if (col == false)
        {
            col = triangleTest(rect, p.points[0], p.points[2], p.points[3]);
            if (col == false) continue;
        }
        
        // TODO: we can actually find where the minimum viewable x value on
        // the current plane is, and test from there, never going further
        // than the maximum possible viewable x
        
        var max = (z == this.z_sets.length - 1) ? this.data.length : 
            this.z_sets[z+1];
        
        for (var i = this.z_sets[z]; i < max; i++)
        {
            // Narrow phase collision detection, which tests per pixel
            if (d[i].px + d[i].w > minx && d[i].py + d[i].h > miny &&
                d[i].px < maxx      && d[i].py < maxy )
            {
                ret.data.splice(ret.data.length,0,d[i]);
                ret.abs_indicies.push(i);
            }
            
            // Keep track of how many tiles were processed:
            pr++;
        }
    }
    
    // Save a bit of information
    ret.clipx = minx;
    ret.clipy = miny;
    ret.clip_height = maxy;
    ret.clip_width = maxx;
    
    ret.super_array = this;
    ret.processed = pr;
    
    return ret;
}

function DSACull() {
    
}

function DSAUpdatePlaneGeometry(obj)
{
    // Is this the biggest xval?
    var plane = this.z_geom[obj.z];
    var delta = false;
    
    // Test for null values, which would mean the ZPlaneObject has not been used
    if (plane.maxx == null)
    {
        plane.maxx = obj.x;
        plane.minx = obj.x;
        plane.miny = obj.y;
        plane.maxy = obj.y;
        plane.updatePixelProjection();
        return;
    }
    
    if (obj.x > plane.maxx)
    {
        plane.maxx = obj.x;
        delta = true;
    } else if (obj.x < plane.minx) {
        plane.minx = obj.x;
        delta = true;
    }
    
    // Is this the biggest or smallest yval?
    if (obj.y > plane.maxy)
    {
        plane.maxy = obj.y;
        delta = true;
    } else if (obj.y < plane.miny) {
        plane.miny = obj.y;
        delta = true;
    }
    
    if (delta == true )
        plane.updatePixelProjection();
}

function DSAInsert(tile, x, y, z)
{
    var object = new DSAObject(tile, x, y, z);
    object.container_array = this;
    
    // Initial case
    if (this.data.length == 0)
    {
        this.maxz = z;
        for (var i = 0; i < z; i++)
        {
            this.z_sets.push(-1);
            this.z_geom.push(new DSAZGeometryObject(i));
        }
        
        // Push the index of the new set
        this.z_sets.push(0);
        this.z_geom.push(new DSAZGeometryObject(z));
        this.updatePlaneGeometry(object);
        
        // Push the actual object
        this.data.splice(0, 0, object);
        return;
    }
    
    // We want to keep track of the start indexes of z sets, so treat
    // the following as a special condition
    if (z > this.maxz)
    {
        // Make blank zsets until we get to the new one
        for (var i = this.maxz; i < z - 1; i++)
        {
            this.z_sets.push(-1);
            this.z_geom.push(new DSAZGeometryObject(i));
        }
        
        // Push object
        this.data.splice(this.data.length, 0, object);
        
        // Push the index of the new set
        this.z_sets.push(this.data.length - 1);
        this.z_geom.push(new DSAZGeometryObject(z));
        this.updatePlaneGeometry(object);
        
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
        }
        
        // Alert on duplicates
        if (this.duplicateDetection == true)
        {
            var dup = false;
            
            if (index != 0)
            {
                if (this.data[index - 1].x == x &&
                    this.data[index - 1].y == y &&
                    this.data[index - 1].z == z)
                    dup = true;
            }
            if (index != this.data.length)
                if (this.data[index].x == x &&
                    this.data[index].y == y &&
                    this.data[index].z == z)
                    dup = true;
            
            if (dup == true)
            {
                var msg = "Warning: Duplicate insertion of ("+x+","+y+","+z+")";
                if (this.allowDuplicates == false)
                {
                    msg += "  Ignoring.";
                    log(msg);
                    return null;
                }
                log(msg);
            }
        }
        
    } else {
        // First element in a zset
        if (z == this.maxz)
        {
            // We're the first to insert into the biggest zset
            index = this.data.length;
        } else {
            // We want to insert before the beginning of the next-biggest zset
            index = this.z_sets[z+1];
        }
        
        // This is a new zval, so note its index in the z_sets[]
        this.z_sets[z] = index;
    }
    
    // zset has increased in length, so increase all following zset indicies
    for (var i = z + 1; i < this.z_sets.length; i++)
        this.z_sets[i] += 1;
    
    // Keep z-geometry up to date
    this.updatePlaneGeometry(object);
    
    // Insert into data array
    this.data.splice(index, 0, object);
    
    return index;
}

function triangleTest(rect, vertex0, vertex1, vertex2)
{
    /*
    This function borrowed faithfully from a wonderfl (:3) discussion on
    calculating triangle collision with AABBs on the following blog:
    http://sebleedelisle.com/2009/05/super-fast-trianglerectangle-intersection-test/
    
    This particular optimization best suits my purposes and was contributed
    to the discussion by Bertrand Larrieu from http://lab9.fr/
    */
    
    var l = rect.x;
    var r = rect.w; 
    var t = rect.y; 
    var b = rect.h;
    
    var x0 = vertex0.x; 
    var y0 = vertex0.y; 
    var x1 = vertex1.x; 
    var y1 = vertex1.y; 
    var x2 = vertex2.x; 
    var y2 = vertex2.y; 
    
    var c, m, s;
    
    var b0 = ((x0 > l) ? 1 : 0) | (((y0 > t) ? 1 : 0) << 1) |
        (((x0 > r) ? 1 : 0) << 2) | (((y0 > b) ? 1 : 0) << 3);
    if (b0 == 3) return true;
    
    var b1 = ((x1 > l) ? 1 : 0) | (((y1 > t) ? 1 : 0) << 1) |
        (((x1 > r) ? 1 : 0) << 2) | (((y1 > b) ? 1 : 0) << 3);
    if (b1 == 3) return true;
    
    var b2 = ((x2 > l) ? 1 : 0) | (((y2 > t) ? 1 : 0) << 1) |
        (((x2 > r) ? 1 : 0) << 2) | (((y2 > b) ? 1 : 0) << 3);
    if (b2 == 3) return true;
    
    var i0 = b0 ^ b1;
    if (i0 != 0)
    {
        m = (y1-y0) / (x1-x0); 
        c = y0 -(m * x0);
        if (i0 & 1) { s = m * l + c; if ( s > t && s < b) return true; }
        if (i0 & 2) { s = (t - c) / m; if ( s > l && s < r) return true; }
        if (i0 & 4) { s = m * r + c; if ( s > t && s < b) return true; }
        if (i0 & 8) { s = (b - c) / m; if ( s > l && s < r) return true; }
    }
    
    var i1 = b1 ^ b2;
    if (i1 != 0)
    {
        m = (y2-y1) / (x2-x1); 
        c = y1 -(m * x1);
        if (i1 & 1) { s = m * l + c; if ( s > t && s < b) return true; }
        if (i1 & 2) { s = (t - c) / m; if ( s > l && s < r) return true; }
        if (i1 & 4) { s = m * r + c; if ( s > t && s < b) return true; }
        if (i1 & 8) { s = (b - c) / m; if ( s > l && s < r) return true; }
    }
    
    var i2 = b0 ^ b2;
    if (i2 != 0)
    {
        m = (y2-y0) / (x2-x0); 
        c = y0 -(m * x0);
        if (i2 & 1) { s = m * l + c; if ( s > t && s < b) return true; }
        if (i2 & 2) { s = (t - c) / m; if ( s > l && s < r) return true; }
        if (i2 & 4) { s = m * r + c; if ( s > t && s < b) return true; }
        if (i2 & 8) { s = (b - c) / m; if ( s > l && s < r) return true; }
    }
    
    return false;
}

