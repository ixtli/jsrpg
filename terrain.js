var terrain = [];

function initTerrain(name_array, sheet)
{
    var ss = sheet.start;
    var tmp = null;
    for (var i = 0; i < name_array.length; i++)
        tmp = new TerrainObject(name_array[i], terrainSprites[ss+i]);
    
}

function TerrainObject(name, sprite)
{
    this.name = name;
    this.sprite = sprite;
    
    this.init = function () {
        terrain[this.name] = this;
    }
    
    this.init();
}



