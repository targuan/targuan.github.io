var Parser = function () {
}
Parser.prototype.parse = function(text) {
    this.text = text
    this.pos = 0
    this.tokens = text
        .replace(/#[^\r\n]*/gi, '')
        .match(/"(?:\\"|[^"])+"|[^ \r\n\t]+/g)
        .filter(function(d){return d.length > 0})
    
    this.map = new Map()
    
    this._current_node = {}
    this._current_link = {}
    
    this.START()
    
    return this.map
}
Parser.prototype.compatible_parse = function(text) {
    // TITLE long name
    compat = ["TITLE", "TARGET"]
    t = text
    for(i=0;i<compat.length;i++) {
        var re = new RegExp(compat[i] + " ([^\"'][^\\r\\n]+)", "g")
        t = t.replace(re, function(match, contents, s, offset) {
            return compat[i]+' "' + contents.replace(/(\\|")/g,'\\$1') + '"';
        })
    }
    // KEYPOS
    
    return this.parse(t)
}


Parser.string = function(token) {
    re = /^[a-zA-Z][a-zA-Z0-9_-]*$/
    return (typeof(token) == "string") && re.exec(token)
}

Parser.integer = function(token) {
    return parseInt(token)
    /*
    re = /^\d+$/
    return (typeof(token) == "string") && re.exec(token)
    */
}
Parser.float = function(token) {
    return parseFloat(token)
    /*
    re = /^\d*\.\d+$/
    return (typeof(token) == "string") && re.exec(token)
    */
}

Parser.bandwidth = function(token) {
    re = /^\d*(\.\d+)?(K|M|G|T)?$/
    return (typeof(token) == "string") && re.exec(token)
}

// NAME string
Parser.prototype.simple_string = function(o, allowed) {
    name = this.tokens[this.pos]
    value = this.tokens[this.pos+1]
    
    if(typeof(name) == "undefined" || typeof(value) == "undefined") {
        return false;
    }
    if(allowed && allowed.indexOf(name) == -1) {
        return false;
    }
    o[name.toLowerCase()] = value
    this.pos += 2
    return true
}

// NAME integer
Parser.prototype.simple_integer = function(o,allowed) {
    name = this.tokens[this.pos]
    value = this.tokens[this.pos+1]
    
    if(typeof(name) == "undefined" || !Parser.integer(value)) {
        return false;
    }
    
    if(allowed && allowed.indexOf(name) == -1) {
        return false;
    }
    o[name.toLowerCase()] = value
    this.pos += 2
    return true
}

Parser.prototype.simple_color = function(o, allowed, none_allowed) {
    if(allowed.indexOf(this.tokens[this.pos]) == -1) {
        return false;
    }
    if(this.tokens[this.pos+1] == 'none') {
        delta = 2
        if(none_allowed.indexOf(this.tokens[this.pos]) == -1) {
            return false;
        }
        value = null
    } else {
        delta = 4
        value = "#"
        for(i=0;i<3;i++) {
            if(!Parser.integer(this.tokens[this.pos+1+i])) {
                return false;
            }
            cv = parseInt(this.tokens[this.pos+1+i])
            if(cv < 0 || cv > 255) {
                return false
            }
            value += cv.toString(16)
        }
    }
    o[this.tokens[this.pos].toLowerCase()] = value
    this.pos += delta
    return true
}

Parser.prototype.START = function() {
    while(this.GLOBAL()){}
    while(this.ELEMENTS()){}
    
    if(this.pos < this.tokens.length) {
        console.log('Unexpected token ' + this.tokens[this.pos]+ this.tokens[this.pos+1]+ this.tokens[this.pos+2])
    }
}

Parser.prototype.GLOBAL = function() {
    return this.simple_string(this.map.properties, 
            ["BACKGROUND",
                "HTMLOUTPUTFILE",
                "DATAOUTPUTFILE",
                "HTMLSTYLESHEET",
                "IMAGEOUTPUTFILE",
                "IMAGEURI",
                "TITLE",
                "HTMLSTYLE",
                ])
    //return this.GLOBAL_BACKGROUND()
        || this.GLOBAL_COLOR()
        || this.GLOBAL_FONT()
        || this.GLOBAL_FONTDEFINE()
        || this.GLOBAL_HEIGHT()
        || this.GLOBAL_INCLUDE()
        || this.GLOBAL_KEYPOS()
        || this.GLOBAL_KEYSTYLE()
        || this.GLOBAL_KILO()
        || this.GLOBAL_MAXTIMEPOS()
        || this.GLOBAL_MINTIMEPOS()
        || this.GLOBAL_SCALE()
        || this.GLOBAL_SET()
        || this.GLOBAL_TIMEPOS()
        || this.GLOBAL_TITLEPOS()
        || this.GLOBAL_WIDTH()
}

Parser.prototype.ELEMENTS = function() {
    return (this.NODE() || this.LINK())
}

Parser.prototype.NODE = function() {
    if(this.tokens[this.pos] != "NODE") {
        return false;
    }
    if(!Parser.string(this.tokens[this.pos+1])) {
        return false;
    }
    this._current_node = new Node(this.tokens[this.pos+1])//{name: this.tokens[this.pos+1], properties: {}}
    this.map.addNode(this._current_node)
    this.pos += 2
    
    while(this.NODE_PROPERTY()) { }
    
    return true;
}


Parser.prototype.GLOBAL_COLOR = function() {
    color_elements = [
        "BGCOLOR",
        "TIMECOLOR",
        "TITLECOLOR",
        "KEYTEXTCOLOR",
        "KEYOUTLINECOLOR",
        "KEYBGCOLOR"
    ]
    color_none_elements = [
        "KEYOUTLINECOLOR",
        "KEYBGCOLOR"
    ]
    return this.simple_color(this.map.properties, color_elements, color_none_elements)
}

Parser.prototype.GLOBAL_FONT = function() {
    font_elements = ["TITLEFONT","KEYFONT","TIMEFONT"]
    if(font_elements.indexOf(this.tokens[this.pos]) != -1) {
        if(Parser.integer(this.tokens[this.pos+1])) {
            this.pos += 2
            return true
        }
    }
    return false
}



Parser.prototype.GLOBAL_FONTDEFINE = function() {
    if(this.tokens[this.pos] != "FONTDEFINE") {
        return false
    }
    //FONTDEFINE fontnumber ttffontfile fontsize
    if(Parser.integer(this.tokens[this.pos+1]) 
        && Parser.string(this.tokens[this.pos+2])
        && Parser.integer(this.tokens[this.pos+3])
        ) {
            this.pos += 4
            return true
    }
    //FONTDEFINE fontnumber gdfontfile
    if(Parser.integer(this.tokens[this.pos+1]) 
        && Parser.string(this.tokens[this.pos+2])
        ) {
            this.pos += 3
            return true
    }
    
    return false
}

Parser.prototype.GLOBAL_HEIGHT = function() {
    return false
}

Parser.prototype.GLOBAL_INCLUDE = function() {
    return false
}

// TODO
Parser.prototype.GLOBAL_KEYPOS = function() {
    if(this.tokens[this.pos] != "KEYPOS") {
        return false
    }
    // KEYPOS x-pos y-pos
    if(Parser.integer(this.tokens[this.pos+1]) && Parser.integer(this.tokens[this.pos+2])) {
        delta = 3
        name = "DEFAULT"
        x = parseFloat(this.tokens[this.pos+1])
        y = parseFloat(this.tokens[this.pos+2])
        this.pos += delta
        return true
    }
    // KEYPOS x-pos y-pos headingstring
    // KEYPOS scalename x-pos y-pos
    // KEYPOS scalename x-pos y-pos headingstring
    
    return false
}

Parser.prototype.GLOBAL_KEYSTYLE = function() {
    return false
}

Parser.prototype.GLOBAL_KILO = function() {
    return false
}

Parser.prototype.GLOBAL_MAXTIMEPOS = function() {
    return false
}

Parser.prototype.GLOBAL_MINTIMEPOS = function() {
    return false
}

Parser.prototype.GLOBAL_SCALE = function() {
    return false
}

Parser.prototype.GLOBAL_SET = function() {
    return false
}

Parser.prototype.GLOBAL_TIMEPOS = function() {
    return false
}

Parser.prototype.GLOBAL_TITLEPOS = function() {
    return false
}

Parser.prototype.GLOBAL_WIDTH = function() {
    return false
}


Parser.prototype.NODE_PROPERTY = function() {
    return this.simple_integer(this._current_node.properties, [
            "LABELFONT"])
        || this.simple_string(this._current_link.properties, [
            "LABEL",
            "INFOURL"
            ])
        || this.NODE_COLOR()
        || this.NODE_ICON() 
        || this.NODE_INFOURL()
        || this.NODE_LABELANGLE()
        || this.NODE_LABELFONT()
        || this.NODE_LABELOFFSET()
        || this.NODE_MAXVALUE()
        || this.NODE_NOTES()
        || this.NODE_OVERLIBCAPTION()
        || this.NODE_OVERLIBGRAPH()
        || this.NODE_OVERLIBHEIGHT()
        || this.NODE_OVERLIBWIDTH()
        || this.NODE_POSITION()
        || this.NODE_SET()
        || this.NODE_TARGET()
        || this.NODE_TEMPLATE()
        || this.NODE_USEICONSCALE()
        || this.NODE_USESCALE()
        || this.NODE_ZORDER()
}

Parser.prototype.NODE_COLOR = function() {
    color_elements = [
        "LABELFONTCOLOR",
        "LABELFONTSHADOWCOLOR",
        "LABELBGCOLOR",
        "LABELOUTLINECOLOR",
        "AICONOUTLINECOLOR",
        "AICONFILLCOLOR",
    ]
    color_none_elements = [
        "LABELFONTSHADOWCOLOR",
        "LABELBGCOLOR",
        "AICONOUTLINECOLOR",
        "AICONFILLCOLOR"
    ]
    return this.simple_color(this._current_link.properties, color_elements, color_none_elements)
}

Parser.prototype.NODE_ICON = function() {
    if(this.tokens[this.pos] != "ICON") {
        return false;
    }
    // ICON maxwidth maxheight iconimagefile
    if(Parser.float(this.tokens[this.pos+1]) && Parser.float(this.tokens[this.pos+2]) && Parser.string(this.tokens[this.pos+3])) {
        this._current_node.icon = {
            path: this.tokens[this.pos+3],
            maxwidth: parseFloat( this.tokens[this.pos+1]), 
            maxheight: parseFloat( this.tokens[this.pos+2])
        }
        this.pos += 4
        return true
    }
    // ICON none
    if(this.tokens[this.pos+1] == 'none') {
        this._current_node.icon =  {
            path: null,
            maxwidth: NaN,
            maxheight: NaN
        }
        this.pos += 2
        return true;
    }
    // ICON iconimagefile
    //if(Parser.string(this.tokens[this.pos+1])) {
        this._current_node.icon =  {
            path: this.tokens[this.pos+1],
            maxwidth: NaN,
            maxheight: NaN
        }
        this.pos += 2
        return true;
    //}
    return false;
}
Parser.prototype.NODE_TEMPLATE = function() {
    if(this.tokens[this.pos] != "TEMPLATE") {
        return false;
    }
    if(Parser.string(this.tokens[this.pos+1])) {
        this._current_node.template =  this.tokens[this.pos+1]
        this.pos += 2
        return true;
    }
    
    return false
}
Parser.prototype.NODE_POSITION = function() {
    if(this.tokens[this.pos] != "POSITION") {
        return false;
    }
    
    
    // POSITION nodename x-coord y-coord
    if(Parser.string(this.tokens[this.pos+1]) && Parser.float(this.tokens[this.pos+2]) && Parser.float(this.tokens[this.pos+3])) {
        this._current_node.position =  new Point(parseFloat(this.tokens[this.pos+2]),
                                                    parseFloat(this.tokens[this.pos+3]),
                                                    this.tokens[this.pos+1])
        this.pos += 4
        return true;
    }
    
    // POSITION x-coord y-coord
    if(Parser.float(this.tokens[this.pos+1]) && Parser.float(this.tokens[this.pos+2])) {
        this._current_node.position =  new Point(parseFloat(this.tokens[this.pos+1]),
                                                    parseFloat(this.tokens[this.pos+2]),
                                                    null)
        this.pos += 3
        return true;
    }
    
    return false
}

Parser.prototype.NODE_INFOURL = function(){
    return false;
}

Parser.prototype.NODE_LABEL = function(){
    return false;
}

Parser.prototype.NODE_LABELANGLE = function(){
    return false;
}

Parser.prototype.NODE_LABELFONT = function(){
    return false;
}

Parser.prototype.NODE_LABELOFFSET = function(){
    if(this.tokens[this.pos] != "LABELOFFSET") {
        return false
    }
    // LABELOFFSET x-offset y-offset
    if(Parser.float(this.tokens[this.pos+1]) && Parser.float(this.tokens[this.pos+2])) {
        this._current_node.properties.labeloffset = {
            style: "cartesian",
            x: parseFloat(this.tokens[this.pos+1]),
            y: parseFloat(this.tokens[this.pos+2])
        }
        this.pos += 3
        return true
    }
    re = /^((E|W)|((N|S)(E|W)?))$/.exec(this.tokens[this.pos+1])
    
    if(!re) {
        return false
    }
    this._current_node.properties.labeloffset = {
        style: "compass",
        distance: parseFloat(re[6]) || 100
    }
    this.pos += 2
    return true
}

Parser.prototype.NODE_MAXVALUE = function(){
    return false;
}

Parser.prototype.NODE_NOTES = function(){
    return false;
}

Parser.prototype.NODE_OVERLIBCAPTION = function(){
    return false;
}

Parser.prototype.NODE_OVERLIBGRAPH = function(){
    return false;
}

Parser.prototype.NODE_OVERLIBHEIGHT = function(){
    return false;
}

Parser.prototype.NODE_OVERLIBWIDTH = function(){
    return false;
}

Parser.prototype.NODE_SET = function(){
    return false;
}

Parser.prototype.NODE_TARGET = function(){
    return false;
}

Parser.prototype.NODE_USEICONSCALE = function(){
    return false;
}

Parser.prototype.NODE_USESCALE = function(){
    return false;
}

Parser.prototype.NODE_ZORDER = function(){
    return false;
}



Parser.prototype.LINK = function() {
    if(this.tokens[this.pos] != "LINK") {
        return false
    }
    if(!Parser.string(this.tokens[this.pos + 1])) {
        return false
    }
    this._current_link = new Link(this.tokens[this.pos+1])
    //{name: this.tokens[this.pos+1], properties: {}, via: []}
    this.map.addLink(this._current_link)
    this.pos += 2
    
    while(this.LINK_PROPERTY()) { }
    
    return true;
    
    return false
}

Parser.prototype.LINK_PROPERTY = function() {
    
    return this.simple_integer(this._current_link.properties, [
            "OVERLIBWIDTH",
            "OVERLIBHEIGHT",
            "WIDTH",
            ])
        || this.simple_string(this._current_link.properties, [
            "OVERLIBGRAPH",
            "INOVERLIBGRAPH",
            "OUTOVERLIBGRAPH",
            "INFOURL",
            "ININFOURL",
            "OUTINFOURL",
            ])
        || this.LINK_ARROWSTYLE()
        || this.LINK_BANDWIDTH()
        || this.LINK_BWFONT()
        || this.LINK_BWLABEL()
        || this.LINK_BWLABELPOS()
        || this.LINK_BWSTYLE()
        || this.LINK_COLOR()
        || this.LINK_COMMENTFONT()
        || this.LINK_COMMENTPOS()
        || this.LINK_COMMENTSTYLE()
        || this.LINK_DUPLEX()
        || this.LINK_INBWFORMAT()
        || this.LINK_INCOMMENT()
        || this.LINK_INNOTES()
        || this.LINK_INOVERLIBCAPTION()
        || this.LINK_INOVERLIBGRAPH()
        || this.LINK_LINK()
        || this.LINK_LINKSTYLE()
        || this.LINK_NODES()
        || this.LINK_NOTES()
        || this.LINK_OUTBWFORMAT()
        || this.LINK_OUTCOMMENT()
        || this.LINK_OUTNOTES()
        || this.LINK_OUTOVERLIBCAPTION()
        || this.LINK_OVERLIBCAPTION()
        || this.LINK_SET()
        || this.LINK_SPLITPOS()
        || this.LINK_TARGET()
        || this.LINK_TEMPLATE()
        || this.LINK_USESCALE()
        || this.LINK_VIA()
        || this.LINK_VIASTYLE()
        || this.LINK_WIDTH()
        || this.LINK_ZORDER()
}

Parser.prototype.LINK_ARROWSTYLE = function(){
    if(this.tokens[this.pos] != "ARROWSTYLE") { 
        return false
    }
    if(this.tokens[this.pos+1] == "classic") {
        style = {width: 4, length: 2}
        
        this.pos += 2
    }
    else if(this.tokens[this.pos+1] == "compact") {
        style = {width: 1, length: 1}
        
        this.pos += 2
    }
    else if(Parser.float(this.tokens[this.pos+1]) && Parser.float(this.tokens[this.pos+2])) {
        style = {width: parseFloat(this.tokens[this.pos+1]), 
                 length: parseFloat(this.tokens[this.pos+2])}
        
        this.pos += 3
    } else {
        return false
    }
    
    this._current_link.properties.arrow_style = style
    return true;
}

Parser.prototype.LINK_BANDWIDTH = function(){ 
    if(this.tokens[this.pos] != "BANDWIDTH") { 
        return false
    }
    if(!Parser.bandwidth(this.tokens[this.pos + 1])) {
        return false
    }
    bw = {in: this.tokens[this.pos + 1], out: this.tokens[this.pos + 1]}
    this.pos += 2
    // BANDWIDTH max-in-bandwidth max-out-bandwidth
    if(Parser.bandwidth(this.tokens[this.pos])) {
        bw.out = this.tokens[this.pos]
        this.pos += 1;
    }
    this._current_link.bandwidth = bw
    return true;
}

Parser.prototype.LINK_BWFONT = function(){
    if(this.tokens[this.pos] != "BWFONT") { 
        return false
    }
    if(!Parser.integer(this.tokens[this.pos+1])) {
        return false
    }
    this._current_link.bwfont = parseInt(this.tokens[this.pos+1])
    
    this.pos += 2
    return true;
}

Parser.prototype.LINK_BWLABEL = function(){
    format_name = ["percent","none","bits"]
    if(this.tokens[this.pos] != "BWLABEL") {
        return false
    }
    if(format_name.indexOf(this.tokens[this.pos+1]) == -1) {
        return false
    }
    this._current_link.bwlabel = this.tokens[this.pos+1]
    
    this.pos += 2
    return true;
}

Parser.prototype.LINK_BWLABELPOS = function(){
    return false;
}

Parser.prototype.LINK_BWSTYLE = function(){
    return false;
}

Parser.prototype.LINK_COLOR = function(){
    return false;
}

Parser.prototype.LINK_COMMENTFONT = function(){
    return false;
}

Parser.prototype.LINK_COMMENTPOS = function(){
    return false;
}

Parser.prototype.LINK_COMMENTSTYLE = function(){
    return false;
}

Parser.prototype.LINK_DUPLEX = function(){
    return false;
}

Parser.prototype.LINK_INBWFORMAT = function(){
    return false;
}

Parser.prototype.LINK_INCOMMENT = function(){
    return false;
}

Parser.prototype.LINK_INFOURL = function(){
    return false;
}

Parser.prototype.LINK_ININFOURL = function(){
    return false;
}

Parser.prototype.LINK_INNOTES = function(){
    return false;
}

Parser.prototype.LINK_INOVERLIBCAPTION = function(){
    return false;
}

Parser.prototype.LINK_INOVERLIBGRAPH = function(){
    return false;
}

Parser.prototype.LINK_LINK = function(){
    return false;
}

Parser.prototype.LINK_LINKSTYLE = function(){
    return false;
}

Parser.prototype.LINK_NODES = function(){
    if(this.tokens[this.pos] != "NODES") {
        return false
    }
    
    nodes = []
    for(i=1;i<3;i++) {
        tokens = this.tokens[this.pos+i].split(':')
        // nodename
        if(tokens.length == 1) {
            nodes.push({
                id: tokens[0],
                offset: null
            })
            continue
        }
        
        // nodename{:compassoffset}
        // nodename{:compassoffset}{percentage}
        re = /^((E|W)|((N|S)(E|W)?))(\d+|\d?\.\d+)?$/.exec(tokens[1])
        if(re) {
            node = {id: tokens[0], offset: {
                style: "compass", 
                direction: re[1],
                percent: parseFloat(re[6]) || 100
            }}
            nodes.push(node)
            continue
        }
        
        // nodename{:xoffset:yoffset}
        if(tokens.length == 3) {
            if(!Parser.float(tokens[1]) || ! Parser.float(tokens[2])) {
                return false
            }
            node = {id: tokens[0], offset: {
                style: "cartesian",
                x: parseFloat(tokens[1]),
                y: parseFloat(tokens[2])
                }
             }
            nodes.push(node)
            continue
        }
        
        // nodename{:angle}r{radius}
        [angle, radius] == tokens[1].split('r')
        if(Parser.float(angle) && parser.float(radius)) {
            node = {id: tokens[0], offset: {
                style: "radial",
                angle: parseFloat(angle),
                radius: parseFloat(radius)
                }
             }
            nodes.push(node)
            continue
        }
        
        return false
    }
    
    this._current_link.setNodes(nodes)
    //this._current_link.nodes = nodes
    this.pos += 3
    return true;
}

Parser.prototype.LINK_NOTES = function(){
    return false;
}

Parser.prototype.LINK_OUTBWFORMAT = function(){
    return false;
}

Parser.prototype.LINK_OUTCOMMENT = function(){
    return false;
}

Parser.prototype.LINK_OUTINFOURL = function(){
    return false;
}

Parser.prototype.LINK_OUTNOTES = function(){
    return false;
}

Parser.prototype.LINK_OUTOVERLIBCAPTION = function(){
    return false;
}

Parser.prototype.LINK_OUTOVERLIBGRAPH = function(){
    return false;
}

Parser.prototype.LINK_OVERLIBCAPTION = function(){
    return false;
}

Parser.prototype.LINK_OVERLIBGRAPH = function(){
    return false;
}

Parser.prototype.LINK_OVERLIBHEIGHT = function(){
    return false;
}

Parser.prototype.LINK_OVERLIBWIDTH = function(){
    return false;
}

Parser.prototype.LINK_SET = function(){
    return false;
}

Parser.prototype.LINK_SPLITPOS = function(){
    return false;
}

Parser.prototype.LINK_TARGET = function(){
    if(this.tokens[this.pos] != "TARGET") {
        return false
    }
    this._current_link.properties['target'] = this.tokens[this.pos+1]
    
    this.pos += 2
    return true;
}

Parser.prototype.LINK_TEMPLATE = function(){
    return false;
}

Parser.prototype.LINK_USESCALE = function(){
    return false;
}

Parser.prototype.LINK_VIA = function(){
    if(this.tokens[this.pos] != 'VIA') {
        return false
    }
    //VIA nodename x-offset y-offset
    if(Parser.string(this.tokens[this.pos+1]) 
        && Parser.float(this.tokens[this.pos+2]) 
        && Parser.float(this.tokens[this.pos+3])) {
    
        via = new Point(parseFloat(this.tokens[this.pos+2]),
                        parseFloat(this.tokens[this.pos+3]),
                        tokens[this.pos+1])
        this.pos += 4
        this._current_link.via.push(via)
        return true
    }else if(Parser.float(this.tokens[this.pos+1])  //VIA x-offset y-offset
        && Parser.float(this.tokens[this.pos+2])) {
        
        via = new Point(parseFloat(this.tokens[this.pos+1]),
                        parseFloat(this.tokens[this.pos+2]),
                        null)
        
        this.pos += 3
        this._current_link.via.push(via)
        return true
    }
    
    //VIA x-offset y-offset
    return false;
}

Parser.prototype.LINK_VIASTYLE = function(){
    return false;
}

Parser.prototype.LINK_WIDTH = function(){
    return false;
}

Parser.prototype.LINK_ZORDER = function(){
    return false;
}




to_parse = '# some initial comments...\r\n#\r\n# This sample configuration file demonstrates most of the basic features of\r\n# PHP Weathermap, along with some of the cosmetic and layout changes possible\r\n#\r\n#\r\nBACKGROUND background.png\r\nHTMLOUTPUTFILE example.html\r\nIMAGEOUTPUTFILE example.png\r\nTITLE Network Overview\r\nHTMLSTYLE overlib\r\nKEYPOS 10 400\r\n\r\n# define some new TrueType fonts - built-in ones go from 1 to 5, so start high\r\nFONTDEFINE 100 VeraIt 8\r\nFONTDEFINE 101 Vera 12\r\nFONTDEFINE 102 Vera 9\r\n\r\nKEYFONT 102\r\n\r\nLINK DEFAULT\r\n\tBANDWIDTH 100M\r\n\tBWLABEL bits\r\n\tBWFONT 100\r\n\tOVERLIBWIDTH 395\r\n\tOVERLIBHEIGHT 153\r\n\tWIDTH 4\r\n\r\nNODE DEFAULT\r\n\tLABELFONT 101\r\n\r\nNODE transit\r\n\tPOSITION 400 180\r\n\tLABEL TRANSIT\r\n\r\n# a little splash of background colour for these nodes\r\nNODE isp1\r\n\tPOSITION 250 100\r\n\tLABEL ISP1\r\n\t\tINFOURL http://www.isp1.com/support/lookingglass.html\r\n\tLABELBGCOLOR 255 224 224\r\n\r\nNODE isp2\r\n\tPOSITION 550 100\r\n\tLABEL ISP2\r\n\tINFOURL http://www.isp2.net/portal/\r\n\tLABELBGCOLOR 224 255 224\r\n\r\nNODE core\r\n\tPOSITION 400 300\r\n\tLABEL core\r\n\tINFOURL https://core.mynet.net/admin/\r\n\r\nNODE customer1\r\n\tLABEL xy.com\r\n\tPOSITION 150 370\r\n\r\nNODE customer2\r\n\tLABEL ww.co.uk\r\n\tPOSITION 250 450\r\n\r\nNODE infra\r\n\tLABEL INFRASTRUCTURE\r\n\tPOSITION 450 450\r\n\r\n# this node has an icon, and so we push the label to the South edge of it, so it\r\n# can still be read\r\nNODE sync\r\n\tLABEL Sync\r\n\tICON my_router.png\r\n\tLABELOFFSET S\r\n\tLABELFONT 2\r\n\tPOSITION 550 370\r\n# the icon is taken from a Nagios icon pack:\r\n#   http://www.nagiosexchange.org/Image_Packs.75.0.html?&tx_netnagext_pi1[p_view]=110&tx_netnagext_pi1[page]=10%3A10\r\n\r\nNODE site1\r\n\tLABEL site1\r\n\tPOSITION 700 220\r\n\r\nNODE site2\r\n\tLABEL site2\r\n\tPOSITION 750 420\r\n\r\nLINK sync-core\r\n\tNODES sync core\r\n\tTARGET data/sync_traffic_in_259.rrd\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=256&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=300\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=256\r\n#\r\n# Site1 has two E1s, so we use NODE-offsets to allow them to run parallel\r\n#\r\n\r\nLINK sync-site1a\r\n\tNODES sync:N site1:W\r\n\tWIDTH 3\r\n\tTARGET data/sync_traffic_in_257.rrd\r\n\tBANDWIDTH 2M\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=254&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=126\r\n\r\nLINK sync-site1b\r\n\tNODES sync:E site1:SE\r\n\tWIDTH 3\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=255&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=\r\n\tTARGET data/sync_traffic_in_258.rrd\r\n\tBANDWIDTH 2M\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=56\r\n\r\n#\r\n# site2 also has two links, but this time we use the VIA to curve the links\r\n#\r\nLINK sync-site2a\r\n\tNODES sync site2\r\n\tWIDTH 3\r\n\tVIA 650 380\r\n\tTARGET data/sync_traffic_in_251.rrd\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=248&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=300\r\n\tBANDWIDTH 1M\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=252\r\n\r\nLINK sync-site2b\r\n\tNODES sync site2\r\n\tWIDTH 3\r\n\tVIA 650 420\r\n\tTARGET data/sync_traffic_in_252.rrd\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=228&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=300\r\n\tBANDWIDTH 1M\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=561\r\n\r\n#\r\n# ISP 1 has a several links, again, but they prefer to see one arrow, and the aggregate bandwidth\r\n#   so we use multiple TARGETs on one line, here, to sum the data\r\n\r\nLINK transit-isp1\r\n\tNODES transit isp1\r\n\tTARGET data/trans1_traffic_in_352.rrd data/trans1_traffic_in_378.rrd data/trans1_traffic_in_420.rrd\r\n\tBANDWIDTH 10M\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=355&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=633\r\n\r\nLINK transit-isp2\r\n\tNODES transit isp2\r\n\tTARGET data/trans1_traffic_in_438.rrd\r\n\tBANDWIDTH 34M\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=433&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=300\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=265\r\n\r\nLINK core-transit\r\n\tNODES transit core\r\n\tTARGET data/trans1_traffic_in_350.rrd\r\n\tARROWSTYLE compact\r\n\tWIDTH 4\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=347&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=300\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=122\r\n\r\nLINK cust1-core\r\n\tNODES customer1 core\r\n\tTARGET data/extreme_traffic_in_299.rrd\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=296&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=300\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=237\r\n\r\nLINK cust2-core\r\n\tNODES customer2 core\r\n\tTARGET data/extreme_traffic_in_286.rrd\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=283&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=300\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=222\r\n\r\nLINK infra-core\r\n\tNODES infra core\r\n\tTARGET data/extreme_traffic_in_294.rrd\r\n\tOVERLIBGRAPH http://support.mynet.net/cacti/graph_image.php?local_graph_id=291&rra_id=0&graph_nolegend=true&graph_height=100&graph_width=300\r\n\tINFOURL http://support.mynet.net/cacti/graph.php?rra_id=all&local_graph_id=228'

p = new Parser()
parsed = p.compatible_parse(to_parse)