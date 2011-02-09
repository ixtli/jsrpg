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
                map.insert(sprites[0], x, y, z);
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

