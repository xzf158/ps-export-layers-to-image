#target photoshop

var htmlTemplate = '<!DOCTYPE html>\r\n';
    htmlTemplate += '<html lang="en">\r\n';
    htmlTemplate += '    <head>\r\n';
    htmlTemplate += '        <meta charset="utf-8" />\r\n';
    htmlTemplate += '        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>\r\n';
    htmlTemplate += '        <meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no" />\r\n';
    htmlTemplate += '        <title>{{title}}</title>\r\n';
    htmlTemplate += '        <link rel="stylesheet" type="text/css" href="main.css">\r\n';
    htmlTemplate += '    </head>\r\n';
    htmlTemplate += '    <body>\r\n';
    htmlTemplate += '        <div class="holder">\r\n';
    htmlTemplate += '{{content}}';
    htmlTemplate += '        </div>\r\n';
    htmlTemplate += '    </body>\r\n';
    htmlTemplate += '</html>\r\n';

    var docW = 0, 
        docH = 0,
        docName;
 
function main(){
    if(!documents.length) return;
    var doc = activeDocument,
        oldPath = activeDocument.path,
        outFolder = new Folder(oldPath + "/out"),
        imageFolder = new Folder(oldPath + "/out/images"),
        datas = [];

    if (!outFolder.exists) {
        outFolder.create();
    }

    if (!imageFolder.exists) {
        imageFolder.create();
    }

    docW = (activeDocument.width + "").replace(" ","");
    docH = (activeDocument.height + "").replace(" ","");
    docName = decodeURI(activeDocument.name);

    scanLayerSets(doc);
    writeDataToFile(createCss(datas, true), outFolder.fullName + "/main.css");
    writeDataToFile(createHtml(datas, true), outFolder.fullName + "/index.html");

    function scanLayerSets(el) {
        // find layer groups
        for(var a=0; a < el.layerSets.length; a++){
            var lname = el.layerSets[a].name;
            var subname = lname.substr(-4);
            if ( subname == ".png" || subname == ".jpg") {
                saveLayer(el.layers.getByName(lname), lname, imageFolder.fullName, true, subname == ".png");
            } else {
                scanLayerSets(el.layerSets[a]);
            }
        }
     
        // find plain layers in current group whose names end with .png/.jpg
        for(var j=0; j < el.artLayers.length; j++) {
            var name = el.artLayers[j].name;
            var subname = name.substr(-4);
            if ( subname == ".png" || subname == ".jpg") {
                saveLayer(el.layers.getByName(name), name, imageFolder.fullName, false, subname == ".png");
            }
        }
    }
     
    function saveLayer(layer, lname, path, shouldMerge, isPng) {
        var left = layer.bounds[0].value,
            top = layer.bounds[1].value,
            width = layer.bounds[2].value - left,
            height = layer.bounds[3].value - top,
            className = lname.replace(".png", "").replace(".jpg", "");

        datas.push({
            top: top,
            left: left,
            width: width,
            height: height,
            className: className,
            src: "images/" + lname
        });

        activeDocument.activeLayer = layer;
        dupLayers();
        if (shouldMerge === undefined || shouldMerge === true) {
            activeDocument.mergeVisibleLayers();
        }
        activeDocument.crop(layer.bounds);
        activeDocument.trim(TrimType.TRANSPARENT, true, true, true, true);
        var saveFile= File(path + "/" + lname);
        SaveImage(saveFile, isPng);
        app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
    }
};
 
main();
 
function dupLayers() { 
    var desc143 = new ActionDescriptor();
    var ref73 = new ActionReference();
    ref73.putClass( charIDToTypeID('Dcmn') );
    desc143.putReference( charIDToTypeID('null'), ref73 );
    desc143.putString( charIDToTypeID('Nm  '), activeDocument.activeLayer.name );

    var ref74 = new ActionReference();
    ref74.putEnumerated( charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt') );
    desc143.putReference( charIDToTypeID('Usng'), ref74 );
    executeAction( charIDToTypeID('Mk  '), desc143, DialogModes.NO );
};
 
function SaveImage(saveFile, isPng){
    if(isPng){
        activeDocument.saveAs(new File(saveFile), new PNGSaveOptions(), true, Extension.LOWERCASE);
    }else{
        var saveOptions = new JPEGSaveOptions();
        saveOptions.embedColorProfile = true;
        saveOptions.quality = 10;
        activeDocument.saveAs(new File(saveFile), saveOptions, true, Extension.LOWERCASE);
    }
}

function writeDataToFile(data, path){    
    var dataFile = new File(path);
    dataFile.encoding = "UTF8";
    dataFile.open( "w", "TEXT", "????" );
    dataFile.write("\uFEFF"); 
    
    dataFile.write(data);
    dataFile.close();
}

function createCss(datas, asBg){
    var cssTxt = "body{margin:0px;}\r\n.holder{width:"+ docW +"; height:" + docH + "; position:relative;}\r\n.sprite{position:absolute; background-repeat: no-repeat;}\r\n";
    for(var i=0, il=datas.length; i<il; i++){
        cssTxt += "." + datas[i].className + "{top: "+ datas[i].top +"px; left: "+ datas[i].left +"px; ";
        if(asBg){
            cssTxt += "width: "+ datas[i].width +"px; height: "+ datas[i].height +"px; background-image: url('"+ datas[i].src +"');z-index: "+ (1 + il - i) +"}\r\n";
        }else{
            cssTxt += "}\r\n";
        }
    }
    return cssTxt;
};

function createHtml(datas, asBg){
    var htmlTxt = "";
    for(var i=0, il=datas.length; i<il; i++){
        if(asBg){
            htmlTxt += "            <div class='sprite "+ datas[i].className +"'></div>\r\n";
        }else{
            htmlTxt += "            <div class='sprite "+ datas[i].className +"'><img src='"+ datas[i].src +"' alt=''></div>\r\n";
        }
    }
    return htmlTemplate.replace("{{content}}", htmlTxt).replace("{{title}}", docName);
};