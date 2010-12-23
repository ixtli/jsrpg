function objectCloser(obj)
{
    // Find the object at z-1
    var a = obj.container_array;
    
    if (obj.z + 1 > a.maxz)
        return null;
    
    var index = a.lowestObject(obj.z + 1, obj.x);
    
    // The rule here is to select the lowest 
    if (index != null)
    {
        // Find the object with the lowest Y value that is closest to obj.y
        while (index + 1 < a.data.length)
        {
            // Stay in this x, z set
            if (a.data[index+1].x != obj.x || a.data[index+1].z != obj.z + 1)
                break;
            
            if (a.data[index].y >= obj.y &&
                a.data[index + 1].y > a.data[index].y + 1)
                break;
            
            index++;
        }
        
        return a.data[index];
    }
    return index;
}