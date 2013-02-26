var sigInst = null;
var edgesMap = {};
var removedNodes = [];

function handleFileSelect(evt) {
    evt.preventDefault();

    init();

    var KITSDir = evt.dataTransfer.items[0];

    entry = KITSDir.webkitGetAsEntry();
    traverseFileTree(entry);

    // wait for files to load and parse
    setTimeout(function() {
        console.log(JSON.stringify(edgesMap));
        $.each(edgesMap, 
            function(node, deps) {
                sigInst.addNode(node, { 'x': Math.random(), 'y': Math.random() });
            });

        $.each(edgesMap, 
            function(node, deps) {
                $.each(deps, function (i, dep){
                    sigInst.addEdge(node + "_" + dep, node, dep);
                });
            });

        colorMap = {"kf": "blue", "agent": "green", "tp": "orange", "agentws": "green"};
        sigInst.iterNodes(function (node) {
            console.log(node.id, node);
            node.size = node.inDegree/2 + node.outDegree/2 + 5; // proportional to importance
            node.color = colorMap[node.id.split('-')[0]];
        });

        sigInst.startForceAtlas2();
        // stop and redraw
        setTimeout(function(){
            sigInst.stopForceAtlas2();

            sigInst.iterNodes(function (node) {
                if (node.outDegree === 0 && node.inDegree === 0) {
                    console.log(node);
                    removedNodes.push(node);
                };
            });
            $.each(removedNodes, function (i, node) {
                sigInst.dropNode(node.id);
            });
        }, 3000);
    }, 1000);
}

function init() {
    !sigInst || sigInst.emptyGraph();
    $("#sig").html("");

    sigInst = sigma.init(document.getElementById('sig')).drawingProperties({ defaultLabelColor: '#fff', defaultNodeColor: '#333', defaultEdgeType: 'curve' });

    sigInst.bind('overnodes',function(event){
        var nodes = event.content;
        var neighbors = {};
        sigInst.iterEdges(function(e){
            e.color = sigInst.getNodes(e.source).color;
            if(nodes.indexOf(e.target)>=0 || nodes.indexOf(e.source)>=0){
                neighbors[e.source] = 1;
                neighbors[e.target] = 1;
                e.attr['true_color'] = e.color;
                e.size = 3;
            } else {
                e.hidden = 1;
            }


            if(nodes.indexOf(e.target)>=0){
                e.color = "white";
            }

            if(nodes.indexOf(e.source)>=0){
                e.color = "red";
            }
        }).iterNodes(function(n){
            if(!neighbors[n.id]){
                n.hidden = 1;
            }else{
                n.hidden = 0;
            }
        }).draw(2,2,2);
    }).bind('outnodes',function(){
        sigInst.iterEdges(function(e){
            e.hidden = 0;
            if(e.attr['true_color']) {
                e.color = e.attr['true_color'];
            }
        }).iterNodes(function(n){
            n.hidden = 0;
        }).draw(2,2,2);
    });

    sigInst.draw();
}

function traverseFileTree(entry, path) {
    path = path || "";
    if (entry.isFile) {
        //filterFiles = [".classpath", ".project"]; 
        //return $.inArray(entry.name, filterFiles) >= 0;
        return entry.name === ".project";
    } else if (entry.isDirectory) {
        // Get folder contents
        var dirReader = entry.createReader();
        // TODO: account for the fact that .readEntries is
        // not guaranteed to return all directory's entities
        dirReader.readEntries(function(entries) {
            filterDirs = ["src", "target", ".git", ".settings", "reports", "env-install"];
            entries = $.grep(entries, function(entry) { return $.inArray(entry.name, filterDirs) < 0; });

            var isProject = false;
            for (var i = 0; i < entries.length; i++) {
                isProject = traverseFileTree(entries[i], path + entry.name + "/");
                if (isProject) {
                    var projectFile = getEntryByName(entries, ".project");
                    var classpathFile = getEntryByName(entries, ".classpath");
                    projectFile.file(function(file) {
                        var reader = new FileReader();
                        reader.onload = getName(classpathFile);
                        reader.readAsText(file);
                    });
                    break;
                }
            }
        });
    };
}

function getEntryByName(entries, name) {
    var entry = undefined;
    $.each(entries, function(i, el) {
        if (el.name === name) { entry = el };
    });
    return entry;
}

function parseContent(file, func, path) {
    var reader = new FileReader();
    reader.onload = func;
    reader.readAsText(file);
}

function getPaths(projectName) {
    return function(evt) {
        var xmlDoc = $.parseXML(evt.target.result);
        var xml = $("classpathentry", xmlDoc);
        // all modules
        var paths = [];
        $.each(xml, function(i, el) { 
            if(el.getAttribute("kind") === "var") 
            paths.push(el.getAttribute("path"))
        });
        // our modules
        var fpaths = paths.filter(function(el) { return el.indexOf("kf/atg/module") !== -1 });
        fpaths = fpaths.map(function(path) { 
            var s = path.split("/kf/atg/module/")[1];
            s = s.split('/');
            s = s.filter(function(part) { return part.indexOf('.') < 0 }); // filter out versions
            s = s[1] || s[0]; // select second part of two-part path (tp/tp-api)
            return s;
        });
        console.log(fpaths);
        edgesMap[projectName] = fpaths;

    }
}

function getName(classpathFile) {
    return function (evt) {
        var xmlDoc = $.parseXML(evt.target.result);
        var name = $($("projectDescription > name", xmlDoc)[0]).text();
        console.log(name);
        //sigInst.addNode(name, { 'x': Math.random(), 'y': Math.random() });
        
        // now compile the list of dependencies for each node:
        if (classpathFile) {
            classpathFile.file(function(file) {
                var reader = new FileReader();
                reader.onload = getPaths(name);
                reader.readAsText(file);
            });
        } 
    }
}

//$("#drop_zone").bind({'dragover': handleDragOver, 'drop': handleFileSelect});
var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', 
function handleDragOver(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}, false);
dropZone.addEventListener('drop', handleFileSelect, false);

document.getElementById('rescale-graph').addEventListener('click',function(){
    sigInst.position(0,0,1).draw();
},true);
var isRunning = false;
document.getElementById('stop-layout').addEventListener('click',function(){
    if(isRunning){
        isRunning = false;
        sigInst.stopForceAtlas2();
        document.getElementById('stop-layout').childNodes[0].nodeValue = 'Start Layout';
    }else{
        isRunning = true;
        sigInst.startForceAtlas2();
        document.getElementById('stop-layout').childNodes[0].nodeValue = 'Stop Layout';
    }
},true);
