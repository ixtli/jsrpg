function objectCloser(obj)
{
    return map.snap(obj.x, obj.y, obj.z + 1, true);
}

function objectFurther(obj)
{
    return map.snap(obj.x, obj.y, obj.z - 1, true);
}

function objectRight(obj)
{
    return map.snap(obj.x + 1, obj.y, obj.z, true);
}

function objectLeft(obj)
{
    return map.snap(obj.x - 1, obj.y, obj.z, true);
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
    var ind = 0;
    var zg = null, rect = null;
    for (var z = 0; z < 100; z++)
    {
        for (var x = 0; x < 100; x++)
        {
            for (var y = 0; y < 1; y++)
            {
                //if (Math.floor(Math.random() * 3) == 0) continue;
                
                //ind = Math.floor(Math.random() * 3);
                //ind = 0;
                map.insert(terrain['grass'], x, y, z);
            }
        }
    }
    
    /*
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
