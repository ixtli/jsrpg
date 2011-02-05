function DSAXGeometryObject(start, obj)
{
    this.x = obj.x;
    
    this.minx = 0;
    this.miny = 0;
    this.maxy = 0;
    
    this.count = 0;
    this.start = null;
    
    this.update = DSAXGOUpdate;
    this.addObject = DSAXGOAddObject;
    
    this.addObject(obj, start);
}

function DSAXGOAddObject(obj, index)
{
    // Special case
    if (this.start == null)
    {
        this.start = index;
        this.minx = obj.px;
        this.miny = obj.py;
        this.maxy = this.miny + tileGraphicHeight;
    } else {
        // Start index in the map array
        if (index < this.start) this.start = index;
        
        // Geometry
        if (obj.px < this.minx) this.minx = obj.px;
        if (obj.py < this.miny) this.miny = obj.py;
        if (obj.h + obj.py > this.maxy) this.maxy = obj.py + tileGraphicHeight;
    }
    
    this.count++;
    return true;
}

function DSAXGOUpdate(map, index)
{
    // This is only called if something has changed that requires the entire
    // x value to be rescanned such as deletion or a tile's metric being changed.
    // Therefore we have to treat everything as invalidated and scan the
    // entire x value again.
    
    var d = map.data;
    var obj = d[index];
    var z = obj.z;
    var x = obj.x;
    
    // reinit
    this.start = index;
    this.minx = obj.px;
    this.miny = obj.py;
    this.maxx = this.minx + obj.w;
    this.maxy = this.miny + obj.h;
    
    for (var i = index + 1; i < d.length; i++)
    {
        obj = d[i];
        
        // don't change x or z
        if (obj.z != z || obj.x != x) return;
        
        // Geometry
        if (obj.px < this.minx) this.minx = obj.px;
        if (obj.py < this.miny) this.miny = obj.py;
        if (obj.w + obj.px > this.maxx) this.maxx = obj.px + obj.w;
        if (obj.h + obj.py > this.maxy) this.maxy = obj.py + obj.h;
    }
}

function DSAZGeometryObject(z)
{
    this.minx = null;
    this.maxx = null;
    this.miny = null;
    this.maxy = null;
    this.z = z;
    
    this.points = new Array(4);
    this.xrects = [];
    
    for (var i = 0; i < 4; i++)
        this.points[i] = {x:0, y:0};
    
    this.updatePixelProjection = DSAZGOProject;
    
    return true;
}

function DSAZGOProject()
{
    var i = 0;
    
    var r = pixelProjection(this.minx, this.miny, this.z);
    this.points[i].x = r.px;
    this.points[i].y = r.py + tileGraphicHeight;
    
    i++;
    
    r = pixelProjection(this.maxx, this.miny, this.z);
    this.points[i].x = r.px + tileGraphicWidth;
    this.points[i].y = r.py + tileGraphicHeight + (tileGraphicWidth >> 1);
    
    i++;
    
    r = pixelProjection(this.maxx, this.maxy, this.z);
    this.points[i].x = r.px + tileGraphicWidth;
    this.points[i].y = r.py;
    
    i++;
    
    r = pixelProjection(this.minx, this.maxy, this.z);
    this.points[i].x = r.px;
    this.points[i].y = r.py - (tileGraphicWidth >> 1);
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
    this.minz = null;
    this.maxz = null;
    
    // ZGeometryObjects that keep track of array index and geometry metrics
    this.z_geom = [];
    
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
    this.snap = DSASnap;
    this.updatePlaneGeometry = DSAUpdatePlaneGeometry;
    this.drawPlaneBounds = DSADrawZPlaneBounds;
    
    // Debugging
    this.duplicateDetection = true;
    this.allowDuplicates = false;
    
    // Buffer to update
    this.buffer = null;
    
    // Always return true from constructors
    return true;
}

function DSASnap(x,y,z,stairs)
{
    // If this function is given the coordinates of an existing tile, it returns
    // the object at the first tile above that one with nothing above it.
    // Otherwise, it returns the object at the first tile below the given coords
    
    // It returns null if there is no object below the coordinates in the latter
    
    // The 'stairs' argument is a boolean which, if set, will cause the algo
    // look for an object at (x,y,z) AND (x,y+1,z) 
    
    if (z > this.maxz || z < this.minz)
        return null;
    
    var d = this.data;
    var plane = this.z_geom[z - this.minz];
    if (plane == null)
        return null;
    
    var xrect = plane.xrects[x - plane.minx];
    if (xrect == null)
        return null;
    
    // Try to find the Y value we're looking for via binary search
    var min = xrect.start;
    var max = min + xrect.count - 1;
    var mid = 0;
    var cury = 0;
    do {
        mid = min + ((max - min) >> 1);
        if (y > d[mid].y )
            min = mid + 1;
        else
            max = mid - 1;
        cury = d[mid].y;
    } while ((cury != y || (stairs == true && cury != y + 1)) && min <= max);
    
    // reset min and max
    min = xrect.start
    max = min + xrect.count - 1;
    
    // is the y value present?
    if (cury != y || (stairs == true && cury != y + 1))
    {
        // climb
        while (mid <= max)
        {
            if (d[mid + 1] == null)
                return d[mid];
                
            if (d[mid + 1].y > d[mid].y + 1)
                return d[mid];
            
            mid++
        }
        
        return d[max];
    } else {
        // fall (TODO: this could be smarter, with hill climbing or something)
        for (var i = max; i >= min; i--)
            if (d[i].y < y) return d[i];
    }
    
    // Otherwise there's nothing below
    return null;
}

function DSAFindIndexForObject(obj)
{
    // This method returns the the index of the object passed.
    // Returns null of not present.
    
    // out of zbounds?
    if (obj.z > this.maxz || obj.z < this.minz)
        return null;
    
    var zgeom = this.z_geom;
    var zg = zgeom[obj.z - this.minz];
    
    // Anything in this zplane?
    if (zg == null)
        return null;
    
    // Out of x bounds for this plane?
    if (obj.x > zg.maxx || obj.x < zg.minx)
        return null;
    
    // Anything at this x value?
    var rects = zg.xrects;
    var rect = rects[obj.x - zg.minx];
    if (rect == null)
        return null;
    
    var min = rect.start;
    var d = this.data;
    
    // Figure out the max value
    var max = min + rect.count - 1;
    
    // Binary search for y (wikipedia has psuedocode)
    var mid = 0;
    do {
        mid = min + ((max - min) >> 1);
        if (obj.y > d[mid].y )
            min = mid + 1;
        else
            max = mid - 1;
    } while (d[mid].y != obj.y && min <= max);
    
    // is the y value present?
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
    if (index < 1) return null;
    
    var d = this.data;
    var zgeom = this.z_geom;
    
    // Figure out if there is a block spacially above us or not
    var above = null;
    
    if (index + 1 < d.length)
    {
        if (d[index + 1].x == d[index].x && d[index + 1].z == d[index].z)
            above = d[index+1];
    }
    
    var deleted = d.splice(index, 1)[0];
    var zg_index = deleted.z - this.minz;
    var zg = zgeom[zg_index];
    var rects = zg.xrects;
    
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
    
    // Lower the start index of all xrects in all zplanes ahead of us
    var tmp = null;
    for (var i = zg_index + 1; i < zgeom.length; i++)
    {
        if (zgeom[i] == null)
            continue;
        
        tmp = zgeom[i].xrects;
        
        for (var j = 0; j < tmp.length; j++)
        {
            if (tmp[j] != null)
                tmp[j].start--;
        }
    }
    
    var set_index = rects[0].start;
    var rect_index = deleted.x - zg.minx;
    var rect = rects[rect_index];
    
    // Were we the last object in this zplane?
    if (rects.length == 1 && rect.count == 1)
    {
        zgeom[deleted.z] = null;
        
        // Trim all empty tail sets
        while (zgeom.length > 0)
        {
            if (zgeom[zgeom.length - 1] == null)
                zgeom.pop();
            else
                break;
        }
        
        // Trim all beginning sets
        while (zgeom.length > 0)
        {
            if (zgeom[0] == null)
                zgeom.shift();
            else
                break;
        }
        
        this.minz = zgeom[0].z;
        this.maxz = zgeom[zgeom.length - 1].z;
        
    } else {
        // decrement count
        rect.count--;
        
        // were we the last object in this xplane?
        if (rect.count < 1)
        {
            // this column is gone, delete it
            rects[rect_index] = null;
            
            if (rect_index == 0)
            {
                // delete rects from the front until we find something not null
                while (rects[0] == null)
                    rects.shift();
                
                // update rect index so that the decriment happens to every
                // rect in the set
                rect_index = -1;
            } else if (rect_index == rects.length - 1) {
                // delete rects from the back until we get to something not null
                while (rects[rects.length - 1] == null)
                    rects.pop();
            }
        } else {
            // update the geometry
            if (index == rect.start)
                rect.start++;
            
            rect.update(this, rect.start);
        }
        
        // decrement the start index of all rects ahead of this
        var tmp = null
        for (var i = rect_index + 1; i < rects.length; i++)
        {
            tmp = rects[i];
            if (tmp != null) tmp.start--;
        }
        
        // reset max and min x in constant time
        zg.maxx = rects[rects.length - 1].x;
        zg.minx = rects[0].x;
        
        // Finding the highest yvalue requires scanning the entire zset
        if (deleted.y == zg.miny || deleted.y == zg.maxy)
        {
            zg.maxy = d[set_index].y;
            zg.miny = d[set_index].y;
            
            var max = rect.start + rect.count - 1;
            
            for (var i = set_index + 1; i < max; i++)
            {
                if (d[i].y > zg.maxy)
                    zg.maxy = d[i].y;
                else if (d[i].y < zg.miny)
                    zg.miny = d[i].y;
            }
        }
        
        zg.updatePixelProjection();
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
    
    // update geometry
    this.updatePlaneGeometry(n, index);
    
    // recast a shadow
    this.castShadow(index);
    
    // Update buffer
    this.updateBuffer(true, n.px, n.py, n.w, n.h);
    
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
    
    // zset has increased in length, so increase all following zset indicies
    for (var i = n.z + 1; i < zsets.length ; i++)
        zsets[i] += 1;
    
    this.updatePlaneGeometry(n, index);
    
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
    // return the front-most tile at absolute pixel position (x,y) on the map
    
    var d = this.data;
    var zgeom = this.z_geom;
    var outside = false;
    var min = 0, max = 0;
    var obj = null, px = 0, py = 0, omaxx = 0, omaxy = 0;
    var poly = null;
    var zlist = [];
    
    // Multiple zplanes will probably overlap the point, so find all of them
    var j = 3;
    var inside = false;
    var pi = null, pj = null, pix = 0, piy = 0, pjx = 0, pjy = 0;
    for (var z = 0; z <= zgeom.length; z++)
    {
        p = zgeom[z];
        
        if (p == null) continue;
        
        poly = p.points;
        
        // is the point inside this z plane?
        j = 3;
        inside = false;
        pi = null, pj = null, pix = 0, piy = 0, pjx = 0, pjy = 0;
        for (var i = -1; ++i < 4; j = i)
        {
            pi = poly[i];
            pj = poly[j];
            pix = pi.x; pjx = pj.x;
            piy = pi.y; pjy = pj.y;
            if ((piy <= y && y < pjy) || (pjy <= y && y < piy))
            {
                if (x < (pjx - pix) * (y - piy) / (pjy - piy) + pix)
                    inside = !inside;
            }
        }
        
        // add this plane to the list of sets to consider
        if (inside == true) zlist.push(z);
    }
    
    // Bounds checking
    if (zlist.length == 0)
        return null;
    
    // Check each selected z plane
    var min = 0, max = 0, dx = 0, dy = 0, pixeldata = null, current = null;
    for (var set_index = zlist.length - 1; set_index >= 0; set_index--)
    {
        current = zlist[set_index];
        min = zgeom[current].xrects[0].start;
        max = min + zgeom[current].xrects[0].count;
        if (current == zgeom.length - 1)
        {
            max = d.length;
        } else {
            for (var i = current + 1; i <= zgeom.length - 1; i++)
            {
                if (zgeom[i] != null)
                {
                    max = zgeom[i].xrects[0].start;
                    break;
                }
            }
        }
        
        for (var i = max - 1; i >= min; i--)
        {
            obj = d[i];
            px = obj.px;
            py = obj.py;
            omaxx = px + obj.w;
            omaxy = py + obj.h;
            
            if (px < x && py < y && omaxx > x && omaxy > y)
            {
                dx = Math.floor(x - px);
                dy = Math.floor(y - py);
                pixeldata = obj.tile.img.getContext('2d').getImageData(dx,dy,1,1);
                if (pixeldata.data[3] > alphaSelectionThreshold) {
                    return obj;
                }
            }
        }
    }
    
    return null;
}

function DSADrawZPlaneBounds()
{
    var d = this.data;
    var b = this.buffer;
    var zgeom = this.z_geom;
    
    var p = null, r = null;
    var t = null;
    for (var z = 0; z < zgeom.length; z++)
    {
        p = zgeom[z];
        
        if (p == null) continue;
        
        b.strokeStyle = "red";
        b.beginPath();
        b.moveTo(p.points[0].x - bufferX, p.points[0].y - bufferY);
        b.lineTo(p.points[1].x - bufferX, p.points[1].y - bufferY);
        b.lineTo(p.points[2].x - bufferX, p.points[2].y - bufferY);
        b.lineTo(p.points[3].x - bufferX, p.points[3].y - bufferY);
        b.closePath();
        b.stroke();
    }
}

function DSAUpdateBuffer(update, minx, miny, width, height)
{
    var d = this.data;
    var zgeom = this.z_geom;
    var pr = 0;
    var maxx = minx + width;
    var maxy = miny + height;
    var b = this.buffer;
    var obj = null, px = 0, py = 0, omaxx = 0, omaxy = 0;
    var point0 = 0, point1 = 0, point2 = 0, point3 = 0;
    var prev_context = 0;
    var min = 0, max = 0;
    
    // Ensure that the update hits the buffer
    if (maxx < bufferX || maxy < bufferY ||
        minx > bufferX + bufferWidth || miny > bufferY + bufferHeight)
        return;
    
    // Construct the rectangle representing our viewport
    var rect = {x:minx,y:miny,w:maxx,h:maxy};
    
    // Push context
    b.save();
    
    // Bigin definition of new clipping path
    b.beginPath();
    
    // Make clipping rect
    b.rect(minx - bufferX, miny - bufferY, width, height);
    
    // close path, even though there's no documentation on if this is necessary
    b.closePath();
    
    // Clip the area of relevant changes
    b.clip();
    
    b.clearRect(minx - bufferX, miny - bufferY, width, height);
    
    // Do clipping
    var p = null;
    var rects = null, temp_rect = null;
    var tmp_index = 0, draw = 0;
    for (var z = 0; z < zgeom.length; z++)
    {
        p = zgeom[z];
        
        if (p == null) continue;
        
        point0 = p.points[0];
        point1 = p.points[1];
        point2 = p.points[2];
        point3 = p.points[3];
        
        // Broad phase clipping by treating the plane as a box
        if (point3.y > maxy || point1.y < miny ||
            point3.x > maxx || point1.x < minx)
            continue;
        
        // Do more detailed plane collision test by splitting the zplane
        // in to two triangles and testing whether or not they intersect
        // the viewport, represented as an AABB
        if (triangleTest(rect, point0, point1, point2) == false)
            if (triangleTest(rect, point0, point2, point3) == false)
                continue;
        
        rects = p.xrects;
        
        if (point0.x > minx)
            min = 0;
        else
            min = Math.floor((point0.x - minx) / tileWidth);
        
        if (point1.x < maxx)
            max = rects.length - 1;
        else
            max = rects.length - Math.ceil((point1.x - maxx) /tileWidth);
        
        
        
        for (var i = min; i <= max; i++)
        {
            temp_rect = rects[i];
            
            if (temp_rect == null) continue;
            if (temp_rect.maxy < miny || temp_rect.miny > maxy) continue;
            
            tmp_index = temp_rect.start;
            
            for (var j = tmp_index; j < tmp_index + temp_rect.count; j++)
            {
                obj = d[j];
                px = obj.px - bufferX;
                py = obj.py - bufferY;
                
                // Draw
                if (obj.selected == true)
                {
                    b.drawImage(sprites[1].img, px, py);
                } else {
                    b.drawImage(obj.tile.img, px, py);
                }
                
                // Secondary selection handling
                if (obj.secondary_selection == true)
                {
                    prev_context = b.globalAlpha;
                    b.globalAlpha = secondarySelectionAlpha;
                    b.drawImage(sprites[secondarySelectionSprite].img, px, py);
                    b.globalAlpha = prev_context;
                }
                
                // Draw shadow
                if (obj.shadow != 0)
                {
                    prev_context = b.globalAlpha;
                    b.globalAlpha = obj.shadow;
                    b.drawImage(sprites[shadowMaskTile].img, px, py);
                    b.globalAlpha = prev_context;
                }
            }
        }
    }
    
    b.restore();
    
    if (update == false) return;
    
    // Only redraw viewport if this draw's clipping area is intersecting,
    // inside, or completely enclosing the viewport.
    omaxx = viewX + viewWidth;
    omaxy = viewY + viewHeight;
    
    if ((minx <= viewX && maxx >= omaxx &&
         miny <= viewY && maxy >= omaxy) == false)
    {
        // Maybe clipping rect is entirely inside this object?
        if (omaxx < minx || viewX > maxx || omaxy < miny || viewY > maxy)
        {
            // If the clipping rect is not contained entirely inside
            // the object we can safely skip it
            if ((viewX <= minx && omaxx >= maxx &&
                viewY <= miny && omaxy >= maxy) == false)
            {
                if (minx < omaxx || maxx > viewX || 
                    miny < omaxy || maxy > viewY)
                {
                    return;
                }
            }
        }
        
        // In the following we make a big assumption: the viewport is always
        // COMPLETELY inside the buffer.  If this is not true, something
        // might go wrong.
        
        var tx = minx > viewX ? minx : viewX;
        var ty = miny > viewY ? miny : viewY;
        var tw = tx+width;
        if (tw > omaxx) tw = omaxx;
        tw -= tx;
        var th = ty+height;
        if (th > omaxy) th = omaxy;
        th -= ty;
        
        var sx = tx - bufferX;
        if (sx < 0) sx = 0;
        
        var sy = ty - bufferY;
        if (sy < 0) sy = 0;
        
        canvasContext.drawImage(buffer, sx, sy, tw, th,
            tx - viewX, ty - viewY, tw, th);
    }
    
    return;
}

function DSACull() {
    
}

function DSAUpdatePlaneGeometry(obj, index)
{
    // This function updates the zgeometry assuming that obj at index has
    // just been added to the DSA.
    
    // Is this the biggest xval?
    var zg = this.z_geom;
    var plane = zg[obj.z - this.minz];
    var delta = false;
    var x = obj.x;
    var y = obj.y;
    
    // Test for null values, which would mean the ZPlaneObject has not been used
    if (plane.maxx == null)
    {
        plane.maxx = x;
        plane.minx = x;
        plane.miny = y;
        plane.maxy = y;
        plane.xrects[0] = new DSAXGeometryObject(index, obj);
        plane.updatePixelProjection();
        return;
    }
    
    var xr = plane.xrects;
    if (x > plane.maxx)
    {
        // add space between old maxx and new one
        for (var i = 0; i < x - plane.maxx - 1; i++)
            xr.push(null);
        
        // ad new description
        xr.push(new DSAXGeometryObject(index, obj));
        
        plane.maxx = x;
    } else if (x < plane.minx) {
        // Add the space between the old minx and the new minx
        for (var i = 0; i < plane.minx - x - 1; i++)
            xr.splice(0,0,null);
        
        // Add description for the new one
        xr.splice(0,0,new DSAXGeometryObject(index, obj));
        
        plane.minx = x;
    } else {
        // It's in the middle
        var cur = x - plane.minx;
        if (xr[cur] == null)
            xr[cur] = new DSAXGeometryObject(index, obj);
        else
            xr[cur].addObject(obj, index);
        
        // gotta increase the start of every other DSAXGeom object
        for (var i = cur + 1; i < xr.length; i++)
            if (xr[i] != null) xr[i].start++;
    }
    
    // increase the start of every other DSAXGeom object in every other zgeom
    var rects = null;
    for (var i = (obj.z - this.minz) + 1; i <= zg.length; i++)
    {
        if (zg[i] == null) continue;
        
        rects = zg[i].xrects;
        for (var j = 0; j < rects.length; j++)
            if (rects[j] != null) rects[j].start++;
    }
    
    // Is this the biggest or smallest yval?
    if (y > plane.maxy)
    {
        plane.maxy = y;
    } else if (y < plane.miny) {
        plane.miny = y;
    }
    
    plane.updatePixelProjection();
}

function DSAInsert(tile, x, y, z)
{
    var d = this.data;
    var data_length = d.length;
    var zgeom = this.z_geom;
    var object = new DSAObject(tile, x, y, z);
    
    // Initial case
    if (data_length == 0)
    {
        this.minz = z;
        this.maxz = z;
        
        // Push the actual object
        d.splice(0, 0, object);
        
        // Push the index of the new set
        zgeom.push(new DSAZGeometryObject(z));
        this.updatePlaneGeometry(object, 0);
        
        return;
    }
    
    // We want to keep track of the start indexes of z sets, so treat
    // the following as a special condition
    if (z > this.maxz)
    {
        // Make blank zgeoms until we get to the new one
        while (zgeom.length < (z - 1) - this.minz)
            zgeom.push(null);
        
        // Push object
        d.splice(data_length, 0, object);
        
        // Push the index of the new set
        zgeom.push(new DSAZGeometryObject(z));
        this.updatePlaneGeometry(object, data_length);
        
        // Update maxz value
        this.maxz = z;
        
        return;
    } else if (z < this.minz) {
        // blank zgeoms
        for (var i = z + 1; i < this.minz; i++)
            zgeom.splice(0,0,null);
        
        // Push object
        d.splice(data_length, 0, object);
        
        // update geometry
        zgeom.splice(0,0,new DSAZGeometryObject(z));
        this.updatePlaneGeometry(object, 0);
        
        // update min value
        this.minz = z;
        return;
    }
    
    // Are we the first tile in a middle zplane?
    var zgeom_index = z - this.minz;
    var zplane = zgeom[zgeom_index];
    if (zplane == null) {
        // First object for this z value
        
        var index = null;
        for (var i = zgeom_index + 1; i < zgeom.length; i++)
        {
            if (zgeom[i] != null)
                index = zgeom[i].xrects[0].start;
        }
        
        if (index == null)
        {
            log("Something broke.");
            return;
        }
        
        // Push object
        d.splice(index, 0, object);
        
        // update geometry
        zgeom[zgeom_index] = new DSAZGeometryObject(z);
        this.updatePlaneGeometry(object, index);
        
        return;
    }
    
    // Insert it into the map array where it needs to go.
    // lowest z value first, lowest x, then lowest y
    var index = 0;
    
    index = zplane.xrects[0].start;
    var xstart = index;
    for (; index < data_length; index++)
    {
        // stay in this z value
        if (d[index].z != object.z)
            break;
        
        if (d[index].x > object.x)
            break;
        
        if (d[xstart].x != d[index].x)
            xstart = index;
    }
    
    // Does this x value exist in this zval yet?  If so, sort by y
    if (d[xstart].x == object.x)
    {
        index = xstart;
        for (; index < data_length; index++)
        {
            // stay in this z and x plane
            if (d[index].z != object.z ||
                d[index].x != object.x)
                break;
            
            if (d[index].y > object.y)
                break;
        }
    }
    
    // Alert on duplicates
    if (this.duplicateDetection == true)
    {
        var dup = false;
        
        if (index != 0)
        {
            if (d[index - 1].x == x &&
                d[index - 1].y == y &&
                d[index - 1].z == z)
                dup = true;
        }
        if (index != data_length)
            if (d[index].x == x &&
                d[index].y == y &&
                d[index].z == z)
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
    
    // Keep z-geometry up to date
    this.updatePlaneGeometry(object, index);
    
    // Insert into data array
    d.splice(index, 0, object);
    
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
    
    Lab9's implementations lacked the ability to deal with triangles who had
    vertical faces, and I have modified it.  As well, I have added my own final,
    two part test to determine whether or not the rect is completely contained
    within the triangle.  Lab9 did offer this in a separate package, but the
    speed gain is negligible.  My implentation uses UV coordinates, inspired by
    http://www.blackpawn.com/texts/pointinpoly/default.html
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
    
    var b0 = ((x0 > l) ? 1 : 0) | ((y0 > t) ? 2 : 0) |
             ((x0 > r) ? 4 : 0) | ((y0 > b) ? 8 : 0);
    if (b0 == 3) return true;
    
    var b1 = ((x1 > l) ? 1 : 0) | ((y1 > t) ? 2 : 0) |
             ((x1 > r) ? 4 : 0) | ((y1 > b) ? 8 : 0);
    if (b1 == 3) return true;
    
    var b2 = ((x2 > l) ? 1 : 0) | ((y2 > t) ? 2 : 0) |
             ((x2 > r) ? 4 : 0) | ((y2 > b) ? 8 : 0);
    if (b2 == 3) return true;
    
    var c = 0, m = 0, s = 0, test = 0;
    
    var i0 = b0 ^ b1;
    if (i0 != 0)
    {
        if (x1 != x0)
        {
            m = (y1-y0) / (x1-x0);
            c = y0 -(m * x0);
            if (i0 & 1) { s = m * l + c; if ( s >= t && s <= b) return 1; }
            if (i0 & 2) { s = (t - c) / m; if ( s >= l && s <= r) return 1; }
            if (i0 & 4) { s = m * r + c; if ( s >= t && s <= b) return 1; }
            if (i0 & 8) { s = (b - c) / m; if ( s >= l && s <= r) return 1; }
        } else {
            if (l == x0 || r == x0) return 1;
            if (x0 > l && x0 < r) return 1;
        }
    }
    
    var i1 = b1 ^ b2;
    if (i1 != 0)
    {
        if (x2 != x1)
        {
            m = (y2-y1) / (x2-x1);
            c = y1 -(m * x1);
            if (i1 & 1) { s = m * l + c; if ( s >= t && s <= b) return 1; }
            if (i1 & 2) { s = (t - c) / m; if ( s >= l && s <= r) return 1; }
            if (i1 & 4) { s = m * r + c; if ( s >= t && s <= b) return 1; }
            if (i1 & 8) { s = (b - c) / m; if ( s >= l && s <= r) return 1; }
        } else {
            if (l == x1 || r == x1) return 1;
            if (x1 > l && x1 < r) return 1;
        }
        
    }
    
    var i2 = b0 ^ b2;
    if (i2 != 0)
    {
        if (x2 != x0)
        {
            m = (y2-y0) / (x2 - x0);
            c = y0 -(m * x0);
            if (i2 & 1) { s = m * l + c; if ( s >= t && s <= b) return 1; }
            if (i2 & 2) { s = (t - c) / m; if ( s >= l && s <= r) return 1; }
            if (i2 & 4) { s = m * r + c; if ( s >= t && s <= b) return 1; }
            if (i2 & 8) { s = (b - c) / m; if ( s >= l && s <= r) return 1; }
        } else {
            if (l == x0 || r == x0) return 1;
            if (x0 > l && x0 < r) return 1;
        }
        
    }
    
    // It may be the case that the clipping rect is entirely within a triangle
    // Make a bounding box around the triangle
    var tbb_l = x0 < x1 ? x0 : x1;
    if (tbb_l > x2) tbb_l = x2;
    
    var tbb_t = y0 < y1 ? y0 : y1;
    if (tbb_t > y2) tbb_t = y2;
    
    var tbb_r = x0 > x1 ? x0 : x1;
    if (tbb_r < x2) tbb_r = x2;
    
    var tbb_b = y0 > y1 ? y0 : y1;
    if (tbb_b < y2) tbb_b = y2;
    
    // is the rectangle inside the bounding box?
    if (tbb_l <= l && tbb_r >= r && tbb_t <= t && tbb_b >= b)
    {
        // If so, test each point of the AABB.  If any are within the
        // triangle, then the AABB is entirely inside the triangle
        var v0x = x2 - x0;
        var v0y = y2 - y0; // 2 - 0
        var v1x = x1 - x0;
        var v1y = y1 - y0; // 1 - 0
        var v2x = l - x0;
        var v2y = t - y0; // upper left - 0
        
        var dot00 = (v0x * v0x) + (v0y * v0y); // dot(v0, v0)
        var dot01 = (v0x * v1x) + (v0y * v1y); // dot(v0, v1)
        var dot02 = (v0x * v2x) + (v0y * v2y); // dot(v0, v2)
        var dot11 = (v1x * v1x) + (v1y * v1y); // dot(v1, v1)
        var dot12 = (v1x * v2x) + (v1y * v2y); // dot(v1, v2)
        var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
        var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        
        if ((u >= 0) && (v >= 0) && (u + v <= 1)) return true;
        
        // bottom left - 0
        v2x = l - x0;
        v2y = b - y0;
        
        dot02 = (v0x * v2x) + (v0y * v2y);
        dot12 = (v1x * v2x) + (v1y * v2y);
        u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        if ((u >= 0) && (v >= 0) && (u + v <= 1)) return true;
        
        // bottom right - 0
        v2x = r - x0;
        v2y = b - y0;
        
        dot02 = (v0x * v2x) + (v0y * v2y);
        dot12 = (v1x * v2x) + (v1y * v2y);
        u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        if ((u >= 0) && (v >= 0) && (u + v <= 1)) return true;
        
        // top right - 0
        v2x = r - x0;
        v2y = t - y0;
        
        dot02 = (v0x * v2x) + (v0y * v2y);
        dot12 = (v1x * v2x) + (v1y * v2y);
        u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        if ((u >= 0) && (v >= 0) && (u + v <= 1)) return true;
    }
    
    return false;
}

