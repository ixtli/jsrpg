function DSAXGeometryObject(start, obj)
{
    this.x = obj.x;
    
    this.miny = obj.y;
    this.maxy = obj.y;
    
    this.minx = obj.px;
    this.minpy = obj.py;
    this.maxpy = this.minpy + obj.h;
    
    this.count = 1;
    this.start = start;
    
    return true;
}

DSAXGeometryObject.prototype = {
    
    tileWasDeleted: function (map, deleted)
    {
        // Called when a tile was deleted from this XGeometryObject.
        
        // If the deleted object was in the middle of the xrect, nothing needs
        // to be done.
        if (deleted.py > this.minpy && deleted.py + deleted.h < this.maxpy &&
            deleted.y > this.miny && deleted.y < this.maxy)
            return false;
        
        // If it fails one of these test, we have to regen
        
        var d = map.data;
        var index = this.start;
        var obj = d[index];
        var z = obj.z;
        var x = obj.x;
        
        // reinit
        this.miny = obj.y;
        this.maxy = obj.y;
        this.minpy = obj.py;
        this.maxpy = this.minpy + obj.h;
        
        var max = this.start + this.count, change = false;
        for (var i = index + 1; i < max; i++)
        {
            obj = d[i];
            
            // don't change x or z
            if (obj.z != z || obj.x != x) return;
            
            if (obj.y < this.miny)
                this.miny = obj.y;
            else if (obj.y > this.maxy)
                this.maxy = obj.y;
            
            // Geometry updates
            if (obj.py < this.minpy)
            {
                this.minpy = obj.py;
                change = true;
            }
            
            if (obj.h + obj.py > this.maxpy)
            {
                this.maxpy = obj.py + obj.h;
                change = true;
            }
        }
        
        return change;
    },
    
    addObject: function (obj, index)
    {
        // Start index in the map array
        if (index < this.start) this.start = index;
        
        // Geometry update
        if (obj.y < this.miny) this.miny = obj.y;
        if (obj.py < this.minpy) this.minpy = obj.py;
        
        if (obj.y > this.maxy) this.maxy = obj.y;
        if (obj.h + obj.py > this.maxpy) this.maxpy = obj.py + obj.h;
        
        this.count++;
        return true;
    },
    
};

function DSAZGeometryObject(z)
{
    this.minx = null;
    this.maxx = null;
    this.miny = null;
    this.maxy = null;
    this.z = z;
    
    this.points = new Array(4);
    this.xrects = [];
    
    this.movingList = null;
    this.insideClippingArea = true;
    
    for (var i = 0; i < 4; i++)
        this.points[i] = {x:0, y:0};
    
    return true;
}

DSAZGeometryObject.prototype = {
    
    updatePixelProjection: function ()
    {
        var i = 0, r = null,
        minx = this.minx, maxx = this.maxx,
        miny = this.miny, maxy = this.maxy,
        z = this.z,
        p = this.points;
        
        r = pixelProjection(minx, miny, z);
        p[i].x = r.px;
        p[i++].y = r.py + tileGraphicHeight;
        
        r = pixelProjection(maxx, miny, z);
        p[i].x = r.px + tileGraphicWidth;
        p[i++].y = r.py + tileGraphicHeight + (tileGraphicWidth >> 1);
        
        r = pixelProjection(maxx, maxy, z);
        p[i].x = r.px + tileGraphicWidth;
        p[i++].y = r.py;
        
        r = pixelProjection(minx, maxy, z);
        p[i].x = r.px;
        p[i].y = r.py - (tileGraphicWidth >> 1);
    },
    
    objectStartedMoving: function (x)
    {
        // Object is moving between x and x+1
        var list = this.movingList;
        
        if (list == null)
        {
            this.movingList = [{x: x, count: 1}];
            return true;
        }
        
        var len = list.length, o = null;
        for (var i = 0; i < len; i++)
        {
            o = list[i];
            if (x == o.x)
            {
                o.count++;
                return true;
            } else if (x < o.x) {
                list.splice(i,0,x);
                return true;
            }
        }
        
        list.push({x: x, count:1});
        return true;
    },
    
    objectFinishedMoving: function (x)
    {
        var list = this.movingList;
        
        if (list == null) return false;
        
        var len = list.length, o = null;
        for (var i = 0; i < len; i++)
        {
            o = list[i];
            if (x == o.x)
            {
                if (o.count > 0)
                {
                    o.count--;
                    return true;
                } else {
                    list.splice(i,1);
                    return true;
                }
            }
        }
        
        return false;
    },
    
};

function DSAObject(terrain, x, y, z)
{
    // Member values
    this.x = x;
    this.y = y;
    this.z = z;
    
    // Terrain members
    this.terrain = terrain;
    
    // Object members
    this.obj = null;
    
    // graphics related members
    this.img = null;
    this.h = 0;
    this.px = 0;
    this.py = 0;
    this.moving = false;
    
    // Do we draw the tile's sprite?  Or do some extra work?
    this.shaderList = null;
    
    // Shader stuff
    // TODO: Make this stay updated because it's actually a convenient way
    // to check the distance between this and the next tile up, if there is one
    this.shadow = 0;
    
    // Initial setup of object
    // Generate absolute pixel locations
    this.genPixelValues();
    this.setTerrain(terrain);
    
    // Always return true
    return true;
}

DSAObject.prototype = {
    
    genPixelValues: function ()
    {
        var r = pixelProjection(this.x, this.y, this.z);
        this.px = r.px;
        this.py = r.py;
    },
    
    setTerrain: function(terrain)
    {
        if (terrain == null) return;
        
        // Terrain members
        this.terrain = terrain;
        
        // graphics related members
        this.img = this.terrain.sprite;
        this.h = this.img.height;
    },
    
    addObject: function(obj)
    {
        if (this.obj == null) this.obj = [];
        this.obj.push(obj);
        return true;
    },
    
    removeObject: function(obj)
    {
        var o = this.obj;
        if (o == null) return false;
        if (o.length == 1)
        {
            if (o[0] === obj)
            {
                this.obj = null;
                return true;
            } else {
                return false;
            }
        }
        
        for (var i = o.length - 1; i >= 0; i--)
        {
            if (o[i] === obj)
            {
                o.splice(i,1);
                return true;
            }
        }
        
        return false;
    },
    
    addShader: function (front, shader)
    {
        // return false if not added
        var slist = this.shaderList;
        
        if (slist == null)
        {
            this.shaderList = [shader];
            return true;
        }
        
        for (var i = 0; i < slist.length; i++)
            if (slist[i] === shader) return false;
        
        if (front == true)
            slist.splice(0,0,shader);
        else
            slist.push(shader);
        
        return true;
    },
    
    removeShader: function (shader)
    {
        var slist = this.shaderList;
        if (slist == null) return false;
        
        for (var i = 0; i < slist.length; i++)
        {
            if (slist[i] === shader)
            {
                if (slist.length > 1)
                    return slist.splice(i,1);
                
                this.shaderList = null;
                return shader;
            }
        }
        
        return false;
    }
    
};

function DepthSortedArray()
{
    // Member values
    this.data = [];
    this.minz = null;
    this.maxz = null;
    
    // ZGeometryObjects that keep track of array index and geometry metrics
    this.z_geom = [];
    this.lowest_z = null;
    this.highest_z = null;
    
    // optimization
    this.optimized = false;
    
    // Debugging
    this.duplicateDetection = true;
    this.allowDuplicates = false;
    
    // Buffer to update
    this.buffer = null;
    
    // Always return true from constructors
    return true;
}

DepthSortedArray.prototype = {
    
    insert: function (terrain, x, y, z)
    {
        var d = this.data;
        var data_length = d.length;
        var zgeom = this.z_geom;
        var object = new DSAObject(terrain, x, y, z);
        
        // This adds to arrays
        this.optimized = false;
        
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
        }
        
        if (z < this.minz)
        {
            // blank zgeoms
            for (var i = z + 1; i < this.minz; i++)
                zgeom.splice(0,0,null);
            
            // Add object to FRONT
            d.splice(0, 0, object);
            
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
        
        if (zplane == null)
        {
            // First object for this z value
            
            var index = null;
            for (var i = zgeom_index + 1; i < zgeom.length; i++)
            {
                if (zgeom[i] != null)
                    index = zgeom[i].xrects[0].start;
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
        var index = -1;
        var rects = zplane.xrects;
        var rect = rects[x - zplane.minx];
        // Are there no tiles at this z,x value?
        if (rect == null)
        {
            if (x >= zplane.maxx)
            {
                rect = rects[rects.length - 1];
                index = rect.start + rect.count;
            } else {
                for (var i = x - zplane.minx + 1; i < rects.length; i++)
                {
                    rect = rects[i];
                    if (rect != null)
                    {
                        index = rect.start;
                        break;
                    }
                }
            }
            
            // Insert into data array
            d.splice(index, 0, object);
            
            // Keep z-geometry up to date
            this.updatePlaneGeometry(object, index);
            
            return index;
        }
        
        // There are tiles, so sort by height
        index = rect.start;
        var max = rect.start + rect.count;
        
        for (; index < max; index++)
            if (d[index].y > object.y)
                break;
        
        // Alert on duplicates
        if (this.duplicateDetection == true && index > 0)
        {
            var dup = d[index - 1];
            if (dup.x == x && dup.y == y && dup.z == z)
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
        
        // Insert into data array
        d.splice(index, 0, object);
        
        // Keep z-geometry up to date
        this.updatePlaneGeometry(object, index);
        
        return index;
    },
    
    updateBuffer: function (update, minx, miny, width, height, noCheck)
    {
        // If update == true, redraw any portion of the visible canvas effected
        // by this call.  If noCheck == false, do all intersection testing.
        // Otherwise, simply trust the already given values of insideClippingArea.
        
        var maxx = minx + width;
        var maxy = miny + height;
        
        // Ensure that the update hits the buffer
        if (maxx < bufferX || maxy < bufferY ||
            minx > bufferX + bufferWidth || miny > bufferY + bufferHeight)
            return;
            
        var d = this.data;
        var zgeom = this.z_geom;
        var b = this.buffer;
        var px = 0, py = 0, omaxx = 0, omaxy = 0, p1x = 0, p3x = 0, tx=0, tw=0,
            hz = this.highest_z;
        var point0 = null, point1 = null, point2 = null, point3 = null;
        var p = null, obj = null, sList = null;
        var rects = null, min_rect = null, max_rect = null;
        var tileObj = null, movingObj = null;
        
        // Construct the rectangle representing our viewport
        var rect = {x: minx, y: miny, w: maxx, h: maxy};
        
        // Push context
        b.save();
        
        // Begin definition of new clipping path
        b.beginPath();
        
        // Make clipping rect.
        b.rect(minx - bufferX, miny - bufferY, width, height);
        
        // close path, even though there's no documentation on if this is necessary
        b.closePath();
        
        // Clip the area of relevant changes
        b.clip();
        
        // Clear the area we're about to draw
        b.clearRect(minx - bufferX, miny - bufferY, width, height);
        
        for (var z = this.lowest_z; z <= hz; z++)
        {
            p = zgeom[z];
            
            if (p == null) continue;
            if (p.insideClippingArea == false) continue;
            
            if (noCheck == false)
            {
                point0 = p.points[0];
                point1 = p.points[1];
                point2 = p.points[2];
                point3 = p.points[3];
                
                p1x = point1.x; // minx of zplane
                p3x = point3.x; // maxx of zplane 
                
                // Broad phase clipping by treating the plane as a box
                if (point3.y > maxy || point1.y < miny ||
                    p3x > maxx || p1x < minx)
                    continue;
                    
                // Do more detailed plane collision test by splitting the zplane
                // in to two triangles and testing whether or not they intersect
                // the viewport, represented as an AABB
                if (triangleTest(rect, point0, point1, point2) == false)
                    if (triangleTest(rect, point0, point2, point3) == false)
                        continue;
            } else {
                p1x = p.points[1].x;
                p3x = p.points[3].x;
            }
            
            rects = p.xrects;
            min = 0;
            
            // TODO: This division assumed a tile graphic width of 64
            if (p3x < minx) min = ((minx - p3x) >> 5 ) - 1;
            
            min_rect = rects[min];
            
            if (min_rect != null)
            {
                if (min_rect.minx + tileGraphicWidth <= minx)
                {
                    min++;
                    min_rect = rects[min];
                }
            }
            
            // TODO: this division also assumes tile width of 64
            max = rects.length - 1;
            if (p1x > maxx) max -= ((p1x - maxx) >> 5 ) - 1;
            
            // Correct max and min for possible null entries in the rects array
            if (min_rect == null)
            {
                for (var i = min; i <= max; i++)
                {
                    if (rects[i] != null)
                    {
                        min = i;
                        min_rect = rects[min];
                        break;
                    }
                }
                
                if (min_rect == null) continue;
            }
            
            max_rect = rects[max];
            
            if (max_rect == null)
            {
                for (var i = max - 1; i >= min; i--)
                {
                    max_rect = rects[i];
                    if (max_rect != null)
                    {
                        max = i;
                        break;
                    }
                }
                
                if (max_rect == null)
                    max_rect = rects[min];
            }
            
            // Get min and max data indicies
            min = min_rect.start;
            max = max_rect.start + max_rect.count;
            
            for (var i = min; i < max; i++)
            {
                obj = d[i];
                
                // Objects should not be able to extend lower than the tile
                // so skip tile if it's out of bounds of rect
                py = obj.py;
                if (py >= maxy) continue;
                
                py -= bufferY;
                px = obj.px - bufferX;
                
                // Draw tile and effects.  We can avoid drawing the tile if
                // it couldn't possible encroach into the clipping area
                
                if (py + obj.h + bufferY >= miny)
                {
                    sList = obj.shaderList;
                    if (sList == null)
                    {
                        b.drawImage(obj.img, px, py);
                    } else {
                        for (var j = sList.length - 1; j >= 0; j--)
                            sList[j](obj, b, px, py);
                    }
                }
                
                // Draw objects associated with tile, but remember that they
                // may extend below the height of the tile
                sList = obj.obj;
                if (sList != null)
                {
                    for (var j = sList.length - 1; j >= 0; j--)
                    {
                        tileObj = sList[j];
                        tx = tileObj.px - bufferX;
                        
                        if (tileObj.moving == false)
                        {
                            b.drawImage(tileObj.img, tx, tileObj.py - bufferY);
                            continue;
                        }
                        
                        // Is the object completely to the left of this tile?
                        tw = tileObj.w;
                        if (tx + tw < px) continue;
                        
                        // Is it completely to the right?
                        omaxx = px + tileGraphicWidth;
                        if (tx > omaxx) continue;
                        
                        // Is it hanging off the left size?
                        if (tx < px)
                        {
                            // If so, clip that area
                            tx = px - tx;
                            tw -= tx;
                        } else if (tx + tw > omaxx) {
                            // If it's hanging off the right side, clip it there
                            tw -= tx + tw - omaxx;
                            tx = 0;
                        } else {
                            tx = 0;
                        }
                        
                        b.drawImage(tileObj.img, tx, 0, tw, tileObj.h,
                            tileObj.px - bufferX + tx, tileObj.py - bufferY,
                            tw, tileObj.h);
                    }
                }
            }
            
            // If you need to debug bounds, uncomment the following
            // this.drawZPlaneBounds(z);
        }
        
        b.restore();
        
        if (update == false) return;
        if (horizontalScrollSpeed | verticalScrollSpeed > 0) return;
        
        // Only redraw viewport if this draw's clipping area is intersecting,
        // inside, or completely enclosing the viewport.
        omaxx = viewX + viewWidth;
        omaxy = viewY + viewHeight;
        
        // In the following we make a big assumption: the viewport is always
        // COMPLETELY inside the buffer.  If this is not true, something
        // might go wrong.
        
        if (maxx <= viewX || minx >= omaxx) return;
        if (maxy <= viewY || miny >= omaxy) return;
        
        var ty = 0, th = 0;
        
        tx = minx > viewX ? minx : viewX;
        ty = miny > viewY ? miny : viewY;
        tw = tx + width;
        if (tw > omaxx) tw = omaxx;
        tw -= tx;
        th = ty + height;
        if (th > omaxy) th = omaxy;
        th -= ty;
        
        var sx = tx - bufferX;
        if (sx < 0) sx = 0;
        
        var sy = ty - bufferY;
        if (sy < 0) sy = 0;
        
        canvasContext.drawImage(buffer, sx, sy, tw, th,
            tx - viewX, ty - viewY, tw, th);
    },
    
    cull: function ()
    {
        // TODO: implement
        log("Map cull function not yet implemented.");
        return false;
    },
    
    selectObject: function (x, y)
    {
        // return the front-most tile at absolute pixel position (x,y) on the max
        var d = this.data;
        var zgeom = this.z_geom;
        var outside = false;
        var min = 0, max = 0;
        var obj = null, px = 0, py = 0, omaxx = 0, omaxy = 0;
        var poly = null, p = null;
        
        // Multiple zplanes will probably overlap the point, so find all of them
        var inside = false;
        var pi = null, pj = null, pix = 0, piy = 0, pjx = 0, pjy = 0, j = 3;
        for (var z = this.highest_z; z >= this.lowest_z ; z--)
        {
            p = zgeom[z];
            
            if (p == null) continue;
            if (p.insideClippingArea == false) continue;
            
            // is the point inside this z plane? reset state for pip test
            poly = p.points;
            
            // This is the point-in-poly test done four times.  It's optimized
            // because it gets done every mouse event, so it's not pretty.
            j = 3;
            inside = false;
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
            
            if (inside == false) continue;
            
            min = ((x - poly[0].x) >> 5) - 1;
            if (min == -1) min = 0;
            max = 0;
            
            p = p.xrects;
            
            // scan xrects for the LAST possible rect it could be in
            for (var i = min + 1; i < p.length; i++)
            {
               if (p[i] == null) continue;
               if (p[i].minx > x) break;
               if (p[i].minx < x) max = i;
            }
            
            if (p[min] == null)
            {
                if (max == 0) continue;
                
                for (var i = min + 1; i <= max; i++)
                {
                    if (p[i] != null)
                    {
                        min = i;
                        break;
                    }
                }
            } else if (max == 0) {
                max = min;
            }
            
            min = p[min].start;
            max = p[max].start + p[max].count - 1;
            
            for (var i = max; i >= min; i--)
            {
                obj = d[i];
                px = obj.px;
                py = obj.py;
                omaxy = py + obj.h;
                
                if (py > y || omaxy < y) continue;
                
                px = Math.floor(x - px);
                py = Math.floor(y - py);
                pixeldata = obj.img.getContext('2d').getImageData(px,py,1,1);
                if (pixeldata.data[3] > constants.alphaSelectionThreshold)
                    return obj;
            }
        }
        
        return null;
    },
    
    insertAboveObject: function (obj, terrain)
    {
        return this.insertAboveIndex(this.findIndexForObject(obj), terrain);
    },
    
    insertAboveIndex: function (index, terrain)
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
        
        var n = new DSAObject(terrain, obj.x, obj.y + 1, obj.z);
        
        if (obj.shadow == 1)
        {
            obj.shadow = 0;
        } else if (obj.shadow != 0) {
            n.shadow = obj.shadow + constants.shadowStep;
            obj.shadow = 0;
        }
        
        d.splice(index + 1, 0, n);
        
        // No longer optimized
        this.optimized = false;
        
        // update geometry
        this.updatePlaneGeometry(n, index + 1);
        
        // Recast shadow
        this.castShadow(index);
        
        return n;
    },
    
    insertBelowObject: function (obj, terrain)
    {
        return this.insertBelowIndex(this.findIndexForObject(obj), terrain);
    },
    
    insertBelowIndex: function (index, terrain)
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
        
        var n = new DSAObject(terrain, obj.x, obj.y - 1, obj.z);
        d.splice(index, 0, n);
        
        // No longer optimized
        this.optimized = false;
        
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
        
        return n;
    },
    
    castShadow: function (index)
    {
        if (index == 0) return;
        
        var d = this.data;
        
        var below = d[index - 1];
        
        if (below.x != d[index].x || below.z != d[index].z ) return;
        
        // Don't cast a shadow on something directly below.
        if (below.y == d[index].y - 1) return;
        
        below.shadow = 1 - ((d[index].y - below.y) * constants.shadowStep);
        
        if (below.shadow <= 0)
        {
            below.shadow = 0;
            below.removeShader(shadowShader);
        } else {
            below.addShader(false, shadowShader);
        }
    },
    
    deleteObject: function (obj)
    {
        return this.deleteIndex( this.findIndexForObject(obj) );
    },
    
    deleteIndex: function (index)
    {
        if (index < 0) return null;
        
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
        
        // No longer optimized
        this.optimized = false;
        
        var zg_index = deleted.z - this.minz;
        var zg = zgeom[zg_index];
        var rects = zg.xrects;
        
        // Handle shadow
        if (index - 1 >= 0)
        {
            // If nothing is above us, remove shadow
            if (above == null)
            {
                // Make sure the one below deleted is still in the same xrect
                if (d[index - 1].x == deleted.x &&
                    d[index - 1].z == deleted.z)
                {
                    d[index - 1].shadow = 0;
                    d[index - 1].removeShader(shadowShader);
                }
            }
        }
        
        // Lower the start index of all xrects in all zplanes ahead of us
        var tmp = null;
        for (var i = zg_index + 1; i < zgeom.length; i++)
        {
            if (zgeom[i] == null) continue;
            
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
            
            var geomChange = true;
            
            // were we the last object in this xplane?
            if (rect.count < 1)
            {
                // this column is gone, delete it
                rects[rect_index] = null;
                
                if (rect_index == 0)
                {
                    // delete rects from the front until we find something not null
                    while (rects[0] == null) rects.shift();
                    
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
                geomChange = rect.tileWasDeleted(this, deleted);
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
            
            // Was the rect in question recalculated?
            if (geomChange == true)
            {
                // Finding the highest yvalue requires scanning the entire zset
                zg.maxy = rects[0].maxy;
                zg.miny = rects[0].miny;
                
                var max = rects.length;
                for (var i = 1; i < max; i++)
                {
                    rect = rects[i];
                    if (rect == null) continue;
                    
                    if (rect.maxy > zg.maxy)
                        zg.maxy = rect.maxy;
                    else if (rect.miny < zg.miny)
                        zg.miny = rect.miny;
                }
            }
            
            zg.updatePixelProjection();
        }
        
        // Notify game objects associated with this tile that the tile is
        // no longer being displayed
        var objList = deleted.obj;
        if (objList != null)
        {
            for (var i = objList.length - 1; i >= 0; i--)
                objList[i].tileWasDeleted();
        }
        
        return deleted;
    },
    
    findIndexForObjectAt: function (x,y,z)
    {
        return this.findIndexForObject(new DSAObject(null, x, y, z));
    },
    
    findIndexForObject: function (obj)
    {
        // This method returns the the index of the object passed.
        // Returns null of not present.
        
        if (obj == null) return;
        
        // out of zbounds?
        if (obj.z > this.maxz || obj.z < this.minz) return null;
        
        var zgeom = this.z_geom;
        var zg = zgeom[obj.z - this.minz];
        
        // Anything in this zplane?
        if (zg == null) return null;
        
        // Out of x bounds for this plane?
        if (obj.x > zg.maxx || obj.x < zg.minx) return null;
        
        // Anything at this x value?
        var rects = zg.xrects;
        var rect = rects[obj.x - zg.minx];
        if (rect == null) return null;
        
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
        if (d[mid].y != obj.y) return null;
        
        // Success!
        return mid;
    },
    
    snap: function (x,y,z,stairs)
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
    },
    
    fall: function (x,y,z)
    {
        // Fall from height Y at (x,z) and return the first object found.
        // Return null if nothing
        
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
        } while (cury != y && min <= max);
        
        // Is the y value present?
        if (d[mid].y == y) return d[mid];
        
        // If it's not, go down by reseting min and max
        min = xrect.start;
        max = min + xrect.count - 1;
        
        // TODO: This could choose a start location in a smarter way
        for (var i = max; i >= min; i--)
            if (d[i].y < y) return d[i];
        
        return null;
    },
    
    markBufferCollision: function (direction)
    {
        // This function basically updates the highest_z and lowest_z
        // values for this map based on where the buffer is so that
        // subsequent draws don't have to do collision testing on each one.
        
        var zg = this.z_geom;
        var maxx = bufferX + bufferWidth;
        var maxy = bufferY + bufferHeight;
        var rect = {x: bufferX, y:bufferY, w:maxx, h:maxy};
        var p = null, point0 = null, point1 = null, point2 = null, point3 = null;
        var min = 0, max = 0;
        
        // Which direction has the buffer moved in?
        switch (direction)
        {
            case 1:
            // Up or right
            max = this.highest_z + 1;
            break;
            
            case 2:
            // Down or left
            min = this.lowest_z;
            max = zg.length;
            break;
            
            case 0:
            default:
            // Don't assume anything
            this.lowest_z = zg.length + 1
            this.highest_z = -1;
            max = zg.length;
            break;
        }
        
        for (var i = min; i < max; i++)
        {
            p = zg[i];
            
            if (p == null) continue;
            
            point0 = p.points[0];
            point1 = p.points[1];
            point2 = p.points[2];
            point3 = p.points[3];
            
            if (point3.y > maxy || point1.y < bufferY ||
                point3.x > maxx || point1.x < bufferX)
            {
                p.insideClippingArea = false;
                continue;
            }
            
            if (triangleTest(rect, point0, point1, point2) == false)
            {
                if (triangleTest(rect, point0, point2, point3) == false)
                {
                    p.insideClippingArea = false;
                    continue;
                }
            }
            
            if (i > this.highest_z) this.highest_z = i;
            if (i < this.lowest_z) this.lowest_z = i;
            
            p.insideClippingArea = true;
        }
    },
    
    updatePlaneGeometry: function (obj, index)
    {
        // This function updates zgeom assuming that obj at index has
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
            
            // No longer optimized
            this.optimized = false;
            
            plane.maxx = x;
        } else if (x < plane.minx) {
            // Add the space between the old minx and the new minx
            for (var i = 0; i < plane.minx - x - 1; i++)
                xr.splice(0,0,null);
            
            // Add description for the new one
            xr.splice(0,0,new DSAXGeometryObject(index, obj));
            
            // gotta increase the start of every other DSAXGeom object
            for (var i = 1; i < xr.length; i++)
                if (xr[i] != null) xr[i].start++;
            
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
    },
    
    drawZPlaneBounds: function (z)
    {
        // Draw red lines around each zplane's clipping rhombus.
        var d = this.data;
        var b = this.buffer;
        var zgeom = this.z_geom;
        
        var p = zgeom[z];
        if (p == null) return;
        p = p.points;
        
        b.save();
        b.strokeStyle = "red";
        b.beginPath();
        b.moveTo(p[0].x - bufferX, p[0].y - bufferY);
        b.lineTo(p[1].x - bufferX, p[1].y - bufferY);
        b.lineTo(p[2].x - bufferX, p[2].y - bufferY);
        b.lineTo(p[3].x - bufferX, p[3].y - bufferY);
        b.closePath();
        b.stroke();
        b.restore();
    },
    
    optimize: function ()
    {
        if (this.optimized == true) return true;
        
        // This function should do any time-consuming optimizations and set
        // the optimized flag.  For instance, big arrays can be replaced with
        // ones that have been explicitly allocated.
        
        var t0 = new Date();
        
        // explicitly allocate space for zgeom
        var zg = this.z_geom;
        var temp = new Array(zg.length);
        for (var i = 0; i < zg.length; i++)
            temp[i] = zg[i];
        
        delete this.z_geom;
        this.z_geom = temp;
        zg = this.z_geom;
        
        // explicitly allocate space for xrects
        var xr = null;
        for (var i = 0; i < zg.length; i++)
        {
            if (zg[i] == null) continue;
            
            xr = zg[i].xrects;
            temp = new Array(xr.length);
            for (var j = 0; j < xr.length; j++)
                temp[j] = xr[j];
            
            delete zg[i].xrects;
            zg[i].xrects = temp;
        }
        
        // explicitly allocate space for tiles
        var d = this.data;
        temp = new Array(d.length);
        for (var i = 0; i < d.length; i++)
            temp[i] = d[i];
        
        delete this.data;
        this.data = temp;
        
        var t1 = new Date();
        log("Map optimized: " + (t1 - t0) + "ms");
        
        this.optimized = true;
        return true;
    }
    
};

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

