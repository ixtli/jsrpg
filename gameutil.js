function objectCloser(obj)
{
    var a = obj.container_array;
    
    if (obj.z + 1 > a.maxz)
        return null;
    
    // Find the object at z-1
    var index = a.lowestObject(obj.z + 1, obj.x);
    
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
    var index = a.lowestObject(obj.z - 1, obj.x);
    
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
    var index = a.lowestObject(obj.z, obj.x + 1);
    
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
    var index = a.lowestObject(obj.z, obj.x - 1);
    
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
