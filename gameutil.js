function objectCloser(obj)
{
    var a = obj.container_array;
    
    if (obj.z + 1 > a.maxz)
        return null;
    
    // Find the object at z-1
    var index = a.indexOfLowestObject(obj.z + 1, obj.x);
    
    if (index != null)
    {
        index = a.correctHeight(index, obj.y);
        index = a.data[index];
    }
    
    return index;
}

function objectFurther(obj)
{
    var a = obj.container_array;
    
    if (obj.z - 1 < 0)
        return null;
    
    // Find the object at z-1
    var index = a.indexOfLowestObject(obj.z - 1, obj.x);
    
    if (index != null)
    {
        index = a.correctHeight(index, obj.y);
        index = a.data[index];
    }
    
    return index;
}

function objectRight(obj)
{
    var a = obj.container_array;
    
    if (obj.x + 1 > a.maxx)
        return null;
    
    // Find the object at z-1
    var index = a.indexOfLowestObject(obj.z, obj.x + 1);
    
    if (index != null)
    {
        index = a.correctHeight(index, obj.y);
        index = a.data[index];
    }
    
    return index;
}

function objectLeft(obj)
{
    var a = obj.container_array;
    
    if (obj.x - 1 < 0)
        return null;
    
    // Find the object at z-1
    var index = a.indexOfLowestObject(obj.z, obj.x - 1);
    
    if (index != null)
    {
        index = a.correctHeight(index, obj.y);
        index = a.data[index];
    }
    
    return index;
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
    for (var y = 0; y < 3; y++)
    {
        for (var z = 0; z < 25; z++)
        {
            for (var x = 0; x < 25; x++)
            {
                var ind = Math.floor(Math.random() * 3);
                //var ind = 0;
                map.insert(sprites[ind], x, y, z);
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

