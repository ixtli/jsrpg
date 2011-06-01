var udata = null;

function UserData()
{
    // Please remember that most all browsers only allow 5mb of localdata
    // Even where you can change this, there is no way for us to request more
    this.localStorage = null;
    
    return this.init();
}

UserData.prototype = {
    
    init: function ()
    {
        if (localStorageIsSupported())
            this.localStorage = localStorage;
        
        // Is local storage supported?
        var ls = this.localStorage;
        if (ls == null) return true;
        
        // Is this the first time we've accessed data before?
        //if (ls.key(0) == null) this.save();
        
        // Read settings from local storage
        
        return true;
    },
    
    clearAll: function ()
    {
        var ls = this.localStorage;
        if (ls == null) return true;
        
        ls.clear();
        
        return true;
    },
    
    saveInputSetting: function (key, value)
    {
        var ls = this.localStorage;
        if (ls == null) return true;
        
        if (inputSettings[key] == null)
            return false;
        
        ls['inputSettings.' + key] = value;
        
        return true;
    },
    
    save: function ()
    {
        // Save current values to local storage
        var ls = this.localStorage;
        if (ls == null) return true;
        
        // Input settings
        for (key in inputSettings)
            ls['inputSettings.' + key] = inputSettings[key];
        
        
        
        return true;
    },
    
    readMap: function (name)
    {
        if (name == null || name == "") return null;
        
        var m = new DepthSortedArray();
        
        
        return m;
    },
    
    cacheMap: function ()
    {
        // Save the current map to userdata for easy restoring
        var ls = this.localStorage;
        if (ls == null) return false;
        
        // Input settings
        var out = map.save();
        if (out == null) return false;
        
        ls['cache.map'] = JSON.stringify(out, null);
        ls['cache.viewX'] = viewX;
        ls['cache.viewY'] = viewY;
        return true;
    },
    
    restoreMap: function ()
    {
        // Restore map from cache
        var ls = this.localStorage;
        if (ls == null) return false;
        
        if (ls['cache.map'] == null)
            return false;
        
        var cache = JSON.parse(ls['cache.map'], null);
        
        delete map;
        map = new DepthSortedArray(0);
        map.restore(cache);
        map.markBufferCollision();
        map.buffer = bufferCtx;
        viewX = parseInt(ls['cache.viewX']);
        viewY = parseInt(ls['cache.viewY']);
        bufferX = viewX;
        bufferY = viewY;
        map.updateBuffer(false, bufferX, bufferY, bufferWidth, bufferHeight);
        redrawFlags = 0xFFFFFFFF;
        viewportDirty = true;
    },
    
    writeMap: function (name, map)
    {
        if (map == null) return false;
        
        var out = map.save();
        if (out == null || out == "")
            return false;
        
        // Convert into dataURI
        out = JSON.stringify(out, null);
        out = "data:text/plane,"+out;
        
        
        return true;
    },
    
};