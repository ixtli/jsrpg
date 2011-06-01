// * TODO obj.sibling(direction)
// * TODO DsaObj.leftOf(obj), obj.siblingLeft() ?
function getSibling(obj, direction)
{
    switch (direction)
    {
    case "closer":
        return map.snap(obj.x, obj.y, obj.z + 1, true);
        break;
    case "further":
        return map.snap(obj.x, obj.y, obj.z - 1, true);
        break;
    case "right":
        return map.snap(obj.x + 1, obj.y, obj.z, true);
        break;
    case "left":
        return map.snap(obj.x - 1, obj.y, obj.z, true);
        break;
    default:
        break;
    }
}

// * TODO viewport.scroll(offsetX,offsetY)
function scrollViewport(direction)
{
    var d = inputSettings.keyboardScrollGranularity;
    
    switch (direction)
    {
    case "up":
        viewY -= d;
        break;
    case "down":
        viewY += d;
        break;
    case "left":
        viewX -= d;
        break;
    case "right":
        viewX += d;
        break;
    default:
        return false;
    }
    
    viewportDirty = true;
    return true;
}

function moveObjectRight(obj)
{
    
}

function moveObjectFurther(obj)
{
    
}

function moveObjectLeft(obj)
{
    
}

function moveObjectCloser(obj)
{
    
}

function generateTestMap()
{
    map = new DepthSortedArray(0);
    t0 = new Date();
    var ind = 0;
    var zg = null, rect = null;
    for (var z = 0; z < 50; z++)
    {
        for (var x = 0; x < 50; x++)
        {
            for (var y = 0; y < 2; y++)
            {
                if (Math.floor(Math.random() * 10) < 2) continue;
                
                //ind = Math.floor(Math.random() * 3);
                //ind = 0;
                map.insert(terrain['grass'], x, y, z);
            }
        }
    }
    
    /*
    for (var z = 0; z < 100; z++)
    {
        for (var x = 0; x < 100; x++)
        {
            for (var y = 2; y < 4; y++)
            {
                if (Math.floor(Math.random() * 10) > 0) continue;
                
                //ind = Math.floor(Math.random() * 3);
                //ind = 0;
                map.insert(terrain['grass'], x, y, z);
            }
        }
    }
    
    
    for (var i = 25; i >= 0; i--)
    {
        for (var j = 25; j >= 0; j--)
        {
            map.insert(sprites[0], j, 0, i);
        }
    }
    
    map.insert(sprites[0], 5, 1, 7);
    map.insert(sprites[0], 7, 1, 7);
    map.insert(sprites[0], 8, 1, 6);
    map.insert(sprites[0], 6, 1, 8);
    
    for (var i = 2; i >= 1; i--)
        map.insert(sprites[0], 6, i, 7);
    
    for (var i = 5; i >= 1; i--)
        map.insert(sprites[0], 5, i, 6);
    
    for (var i = 0; i < 4; i++)
        map.insert(sprites[0], 6, i, 6);
    
    for (var i = 0; i < 10; i++)
        map.insert(sprites[0], 5, i, 5);
    
    for (var i = 5; i >= 1; i--)
        map.insert(sprites[0], 5, i, 6);
    
    for (var i = 5; i >= 1; i--)
        map.insert(sprites[0], 6, i, 5);
    */
    t1 = new Date();
    log("Terrain DSA insertion time: "+ (t1-t0) +"ms "
        + " (" + map.data.length + " tiles)");
    
    // Associate the buffer context with the map DSA
    map.buffer = bufferCtx;
    viewX = 0;
    viewY = 0;
    bufferX = viewX;
    bufferY = viewY;
    map.optimize();
    map.markBufferCollision();
}

function reachableTiles(s, maxDistance, maxHeight)
{
    // Return an array of reachable tiles (could be empty).  Basically this is
    // uniform cost search, but it returns the explored set instead of a goal.
    // This is useful if you want to, say, highlight all the tiles around a unit
    // to which that unit can possibly move.
    var explored = [];
    
    if (maxDistance < 1) return explored;
    
    var startx = s.x, starty = s.y, startz = s.z;
    var frontier = [s];
    var expansion = new Array(4);
    var node = null, temp = null, found = false;
    
    do {
        // Get the current node
        node = frontier.pop();
        
        // Expand current node up
        expansion[0] = map.snap(node.x, node.y, node.z - 1, true);
        expansion[1] = map.snap(node.x, node.y, node.z + 1, true);
        expansion[2] = map.snap(node.x - 1, node.y, node.z, true);
        expansion[3] = map.snap(node.x + 1, node.y, node.z, true);
        
        for (var i = 0; i < 4; i++)
        {
            // Decide if the expanded nodes are within maxDistance and are
            // less than maxHeight relative to the current node.
            temp = expansion[i];
            
            if (temp == null) continue;
            if (Math.abs(temp.y - starty) > maxHeight) continue;
            if (Math.abs(temp.x - startx) + Math.abs(temp.z - startz) > 
                maxDistance) continue;
            
            // Have we already explored this node?  If so don't re-add it.
            found = false;
            for (var j = explored.length - 1; j >= 0; j--)
            {
                if (explored[j] === temp)
                {
                    found = true;
                    break;
                }
            }
            
            if (found == true) continue;
            
            frontier.push(temp);
            explored.push(temp);
        }
        
    } while (frontier.length > 0);
    
    return explored;
}

function optimalPath(s, g, maxDistance, maxHeight)
{
    if (maxDistance < 1) return {r: null, e: null};
    
    var start = {x: s.x, y: s.y, z: s.z, g:0, f:0, prev: null, obj: s}
    var goal = {x: g.x, y: g.y, z: g.z, obj: g};
    
    var frontier = [start];
    var explored = [];
    
    var node = null;
    var expansion = new Array(4);
    var index = -1;
    var temp = null, dsaObj = null;
    var obj = null;
    
    do {
        node = frontier.shift();
        if (node.x == goal.x && node.y == goal.y && node.z == goal.z)
            return {r: node, e:explored};
        explored.push(node);
        
        // Don't go too deep
        if (node.g + 1 > maxDistance) continue;
        
        // Expand current node up
        expansion[0] = map.snap(node.x, node.y, node.z - 1, true);
        expansion[1] = map.snap(node.x, node.y, node.z + 1, true);
        expansion[2] = map.snap(node.x - 1, node.y, node.z, true);
        expansion[3] = map.snap(node.x + 1, node.y, node.z, true);
        
        for (var i = 0; i < 4; i++)
        {
            dsaObj = expansion[i];
            if (dsaObj == null) continue;
            if (Math.abs(dsaObj.y - node.y) > maxHeight) continue;
            
            temp = {x: dsaObj.x, y: dsaObj.y, z: dsaObj.z, g: node.g + 1, f: 0,
                prev: node, obj: dsaObj};
            temp.f = temp.g + Math.abs(temp.x - goal.x) +
                Math.abs(temp.y - goal.y) + Math.abs(temp.z - goal.z);
            
            // Is the child node in the explored set?
            index = -1;
            for (var j = 0; j < explored.length; j++)
            {
                obj = explored[j];
                if (obj.x == temp.x && obj.y == temp.y && obj.z == temp.z)
                {
                    index = 1;
                    break;
                }
            }
            
            // If so break
            if (index != -1) continue;
            
            // Is it in the frontier?
            for (var j = 0; j < frontier.length; j++)
            {
                obj = frontier[j];
                if (obj.x == temp.x && obj.y == temp.y && obj.z == temp.z)
                {
                    index = j;
                    break;
                }
            }
            
            if (index == -1)
            {
                // put this in the frontier
                for (var j = 0; j < frontier.length; j++)
                {
                    if (temp.f < frontier[j].f)
                    {
                        frontier.splice(j, 0, temp);
                        temp = null;
                        break;
                    }
                }
                
                if (temp != null) frontier.push(temp);
            }
            
        }
        
    } while (frontier.length > 0);
    
    return {r: null, e: explored};
}

