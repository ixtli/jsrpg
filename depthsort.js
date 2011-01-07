function DSAZGeometryObject(z)
{
    this.minx = null;
    this.maxx = null;
    this.miny = null;
    this.maxy = null;
    this.z = z;
    
    this.points = new Array(4);
    
    for (var i = 0; i < 4; i++)
        this.points[i] = {x:0, y:0};
    
    this.updatePixelProjection = DSAZGOProject;
    
    return true;
}

function DSAZGOProject()
{
    var i = 0;
    var r = null;
    
    r = pixelProjection(this.minx, this.miny, this.z);
    this.points[i].x = r.px;
    this.points[i].y = r.py + 50;
    
    i++;
    
    r = pixelProjection(this.maxx, this.miny, this.z);
    this.points[i].x = r.px + tileWidth;
    this.points[i].y = r.py + 50;
    
    i++;
    
    r = pixelProjection(this.maxx, this.maxy, this.z);
    this.points[i].x = r.px + tileWidth;
    this.points[i].y = r.py;
    
    i++;
    
    r = pixelProjection(this.minx, this.maxy, this.z);
    this.points[i].x = r.px;
    this.points[i].y = r.py - 50;
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
    
    this.invisible = false;
    
    // The following notify the update algorithm that this object's graphics
    // are going to be drawn outside of the bounds defined by (px,py,w,h)
    this.wide = false;
    this.tall = false;
    
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
    
    this.z_sets = [];
    this.z_geom = [];  // keep track of max and min x and y
    
    // Member functions
    this.insert = DSAInsert;
    this.updateBuffer = DSAUpdateBuffer;
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
    
    // Buffer to update
    this.buffer = null;
    
    // Always return true from constructors
    return true;
}

function DSACorrectHeight(ind, height)
{
    // This method takes a height and the index of the tile with the lowest
    // height at this (z, x) value
    var d = this.data;
    
    // Find the object with the lowest Y value that is closest to obj.y
    var index = ind;
    while (index + 1 < d.length)
    {
        // Stay in this x, z set
        if (d[index+1].x != d[index].x ||
            d[index+1].z != d[index].z)
            break;
        
        // Basically this will find EITHER the nearest tile below height
        // OR the nearest tile with a space above it IF there is a tile
        // at height.  This should be used to determine which way an object
        // goes if entering this (z,x) value at height
        if (d[index].y >= height &&
            d[index + 1].y > d[index].y + 1)
            break;
        
        index++;
    }
    
    return index;
}

function DSAFindLowestObject(z, x)
{
    // This method returns the index of the object with the
    // lowest y value at (x, z)
    var d = this.data;
    var zsets = this.z_sets;
    
    if (zsets[z] == -1)
        return null;
    
    // Get the end of the current zset
    var max = d.length;
    if (z != this.maxz)
        max = zsets[z + 1] - 1;
        
    // Binary search
    var min = zsets[z];
    var mid;
    do {
        mid = min + ((max - min) >> 1);
        if (x > d[mid].x )
            min = mid + 1;
        else
            max = mid - 1;
    } while (d[mid].x != x && min <= max);
    
    // Success
    // Find the lowest block in this xset
    if (d[mid].x == x)
    {
        while (mid > 0)
        {
            if (d[mid - 1].z != z || d[mid - 1].x != x)
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
    
    var d = this.data;
    var zsets = this.z_sets;
    
    // Get the end of the current zset
    var max = d.length;;
    if (obj.z != this.maxz)
        max = zsets[obj.z + 1] - 1;
    
    // Binary search for x
    var min = zsets[obj.z];
    var mid;
    do {
        mid = min + ((max - min) >> 1);
        if (obj.x > d[mid].x )
            min = mid + 1;
        else
            max = mid - 1;
    } while (d[mid].x != obj.x && min <= max);
    
    // is the x value present?
    if (d[mid].x != obj.x)
        return null;
    
    // Search linearly on y for the value
    if (d[mid].y > obj.y)
    {
        // go down
        while (mid >= 0)
        {
            if (d[mid].x != obj.x || d[mid].z != obj.z)
                return null;
            
            if (d[mid].y == obj.y)
                break;
            
            mid--;
        }
    } else {
        // go up
        while (mid < d.length)
        {
            if (d[mid].x != obj.x || d[mid].z != obj.z)
                return null;
            
            if (d[mid].y == obj.y)
                break;
            
            mid++;
        }
    }
    
    // Is the y val correct?
    if (d[mid].y != obj.y)
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
    if (index == 0)
        return;
    
    var d = this.data;
    
    var below = d[index - 1];
    
    if (below.x != d[index].x || below.z != d[index].z )
        return;
    
    // Don't cast a shadow on something directly below.
    if (below.y == d[index].y - 1)
        return;
    
    below.shadow = 1 - ((d[index].y - below.y) * shadowStep);
    
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
    var d = this.data;
    var zsets = this.z_sets;
    var zgeom = this.z_geom;
    
    // Figure out if there is a block spacially above us or not
    var above = null;
    
    if (index + 1 < d.length)
    {
        if (d[index + 1].x == d[index].x &&
            d[index + 1].z == d[index].z)
            above = d[index+1];
    }
    
    var deleted = d.splice(index, 1)[0];
    
    // Handle shadow
    if (above != null)
    {
        this.castShadow(index);
    } else {
        // If nothing is above us, remove shadow
        if (index - 1 >= 0)
        {
            if (d[index - 1].x == deleted.x &&
                d[index - 1].z == deleted.z)
                d[index - 1].shadow = 0;
        }
    }
    
    // Maintain zsets The zset of this object has decreased in size
    // Reduce the size of all zsets above us
    for (var i = deleted.z + 1; i < zsets.length; i++)
        zsets[i] -= 1;
    
    // Were we the last object in this zset?
    if (zsets[deleted.z] == zsets[deleted.z + 1])
    {
        zsets[deleted.z] = -1;
        
        // Since the last set is empty, trim all empty tail sets
        do
        {
            if (zsets[zsets.length - 1] != -1)
                break;
                
            zsets.pop();
            zgeom.pop();
        } while (zsets.length > 0);
        
        // Keep track of maxz value
        this.maxz = zsets.length - 1;
    } else {
        // Since the set isn't empty, update the geom values
        // The x values are the easy part since z-planes are sorted by x val
        var max;
        if (deleted.z == this.maxz)
            max = d.length-1;
        else
            max = zsets[deleted.z+1] - 1;
        
        zgeom[deleted.z].maxx = d[max].x;
        zgeom[deleted.z].minx = d[zsets[deleted.z]].x;
        
        // Finding the highest yvalue requires scanning the entire zset
        if (deleted.y == zgeom[deleted.z].miny || 
            deleted.y == zgeom[deleted.z].maxy)
        {
            for (var i = zsets[deleted.z]; i < max; i++)
            {
                if (d[i].y > zgeom[deleted.z].maxy)
                    zgeom[deleted.z].maxy = d[i].y;
                else if (d[i].y < zgeom[deleted.z].miny)
                    zgeom[deleted.z].miny = d[i].y;
            }
            
            zgeom[deleted.z].updatePixelProjection();
        }
    }
    
    this.updateBuffer(true, deleted.px, deleted.py, deleted.w, deleted.h);
    
    return deleted;
}

function DSAInsertAboveObject(object, tile)
{
    var index = this.findIndexForObject(object);
    return this.insertAboveIndex(index, tile);
}

function DSAInsertAboveIndex(index, tile)
{
    var d = this.data;
    var zsets = this.z_sets;
    
    var obj = d[index];
    
    // Make sure there's nothing above us already
    if (d.length > index + 1)
    {
        if (d[index+1].z == obj.z &&
            d[index+1].x == obj.x &&
            d[index+1].y == obj.y + 1)
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
    
    d.splice(index + 1, 0, n);
    d[index + 1].container_array = this;
    
    // zset has increased in length, so increase all following zset indicies
    for (var i = n.z + 1; i < zsets.length ; i++)
        zsets[i] += 1;
    
    this.updatePlaneGeometry(n);
    
    this.castShadow(index);
    
    // Update buffer
    this.updateBuffer(true, obj.px, obj.py, obj.w, obj.h);
    
    return n;
}

function DSAInsertBelowObject(object, tile)
{
    var index = this.findIndexForObject(object);
    return this.insertBelowIndex(index, tile);
}

function DSAInsertBelowIndex(index, tile)
{
    var d = this.data;
    var zsets = this.z_sets;
    var obj = d[index];
    
    // Make sure there's nothing below us already
    if (index - 1 >= 0)
    {
        if (d[index-1].z == obj.z &&
            d[index-1].x == obj.x &&
            d[index-1].y == obj.y - 1)
            return null;
    }
    
    var n = new DSAObject(tile, obj.x, obj.y - 1, obj.z);
    d.splice(index, 0, n);
    d[index].container_array = a;
    
    // zset has increased in length, so increase all following zset indicies
    for (var i = n.z + 1; i < zsets.length ; i++)
        zsets[i] += 1;
    
    this.updatePlaneGeometry(n);
    
    // We might be the new first block in the zset
    if (index > 0)
    {
        if (d[index - 1].z != d[index].z )
            // we're the new first index in the zset
            zsets[d[index].z] = index;
    }
    
    this.castShadow(index - 1);
    
    // Update buffer
    this.updateBuffer(true, n.px, n.py, n.w, n.h);
    
    return n;
}

function DSASelectObject(x, y)
{
    // return the front-most tile at pixel position (x,y) in the current
    // viewport.
    
    var d = this.data;
    
    for (var i = d.length - 1; i >=0; i--)
    {
        var obj = d[i];
        
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

function DSAUpdateBuffer(clear, minx, miny, width, height)
{
    var d = this.data;
    var zsets = this.z_sets;
    var zgeom = this.z_geom;
    var pr = 0;
    var maxx = minx + width;
    var maxy = miny + height;
    var buffx = bufferX;
    var buffy = bufferY;
    var b = this.buffer;
    
    // Construct the rectangle representing our viewport
    var rect = {x:minx,y:miny,w:maxx,h:maxy};
    
    // Push context
    bufferCtx.save();
    
    // Bigin definition of new clipping path
    bufferCtx.beginPath();
    
    // Make clipping rect
    bufferCtx.rect(minx - buffx, miny - buffy, width, height);
    
    // Clip the area of relevant changes
    bufferCtx.clip();
    
    if (clear) bufferCtx.clearRect(minx - buffx, miny - buffy, width, height);
    
    // Do clipping
    var p = null;
    for (var z = 0; z < zsets.length; z++)
    {
        p = zgeom[z];
        
        if (p == -1) continue;
        
        // Broad phase clipping by treating the plane as a box
        if (p.points[3].y > maxy || p.points[1].y < miny ||
            p.points[3].x > maxx || p.points[1].x < minx)
            continue;
        
        // Do more detailed plane collision test by splitting the zplane
        // in to two triangles and testing whether or not they intersect
        // the viewport, represented as an AABB
        if (triangleTest(rect, p.points[0], p.points[1], p.points[2]) == false)
            if (triangleTest(rect,p.points[0],p.points[2], p.points[3])==false)
                continue;
        
        // TODO: restrict the min value even further by determining
        // the earliest place an x value could start.  This can be done without
        // worrying about the height of the zplane
        
        var min = zsets[z];
        var max = (z == zsets.length - 1) ? d.length : zsets[z+1];
        
        var obj = null, px = 0, py = 0, omaxx = 0, omaxy = 0;
        var outside = false;
        for (var i = min; i < max; i++)
        {
            obj = d[i];
            px = obj.px;
            py = obj.py;
            omaxx = px + obj.w;
            omaxy = py + obj.h;
            
            // Narrow phase collision detection: Treat the object as an AABB
            // and draw it if it intersects the clipping area OR is contained
            // entirely within it.
            if ((minx <= px && maxx >= omaxx &&
                miny <= py && maxy >= omaxy) == false)
            {
                outside = false;
                if ((omaxx < minx || px > maxx) && obj.wide == false)
                    outside = true;
                if ((omaxy < miny || py > maxy) && obj.tall == false)
                    outside = true;
                
                // Maybe clipping rect is entirely inside this object?
                if (outside == true)
                {
                    // If the clipping rect is not contained entirely inside
                    // the object we can safely skip it
                    if ((px <= minx && omaxx >= maxx &&
                        py <= miny && omaxy >= maxy) == false)
                    {
                        if (minx < omaxx || maxx > px)
                            continue;
                        if (miny < omaxy || maxy > py)
                            continue;
                    }
                }
            }
            
            // Adjust location to draw by the top/left of the buffer
            px -= buffx;
            py -= buffy;
            
            // Draw
            b.drawImage(obj.tile.img, px, py);
        }
    }
    
    bufferCtx.restore();
    
    return true;
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
    This function borrowed faithfully ported a wonderfl (:3) discussion on
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
    
    var b0 = ((x0 > l) ? 1 : 0) | (((y0 > t) ? 1 : 0) << 1) |
        (((x0 > r) ? 1 : 0) << 2) | (((y0 > b) ? 1 : 0) << 3);
    if (b0 == 3) return true;
    
    var b1 = ((x1 > l) ? 1 : 0) | (((y1 > t) ? 1 : 0) << 1) |
        (((x1 > r) ? 1 : 0) << 2) | (((y1 > b) ? 1 : 0) << 3);
    if (b1 == 3) return true;
    
    var b2 = ((x2 > l) ? 1 : 0) | (((y2 > t) ? 1 : 0) << 1) |
        (((x2 > r) ? 1 : 0) << 2) | (((y2 > b) ? 1 : 0) << 3);
    if (b2 == 3) return true;
    
    var c = 0, m = 0, s = 0;
    
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

