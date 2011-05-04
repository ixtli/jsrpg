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
        ls = this.localStorage;
        if (ls == null) return true;
        
        ls.clear();
        
        return true;
    },
    
    saveInputSetting: function (key, value)
    {
        ls = this.localStorage;
        if (ls == null) return true;
        
        if (inputSettings[key] == null)
            return false;
        
        ls['inputSettings.' + key] = value;
        
        return true;
    },
    
    save: function ()
    {
        // Save current values to local storage
        ls = this.localStorage;
        if (ls == null) return true;
        
        // Input settings
        for (key in inputSettings)
            ls['inputSettings.' + key] = inputSettings[key];
        
        
        
        return true;
    },
    
};