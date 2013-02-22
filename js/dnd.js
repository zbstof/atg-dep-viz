var sigRoot = document.getElementById('sig');
var sigInst = sigma.init(sigRoot);
var edgesStack = [];

function handleFileSelect(evt) {
    evt.preventDefault();

    var items = evt.dataTransfer.items;
    var KITSDir = evt.dataTransfer.items[0];

    entry = KITSDir.webkitGetAsEntry();
    traverseFileTree(entry);

    sigInst.draw();
}

function handleDragOver(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function traverseFileTree(entry, path) {
    path = path || "";
    if (entry.isFile) {
        filterFiles = [".classpath", ".project"]; 
        return $.inArray(entry.name, filterFiles) >= 0;
    } else if (entry.isDirectory) {
        // Get folder contents
        var dirReader = entry.createReader();
        // TODO: account for the fact that .readEntries is
        // not guaranteed to return all directory's entities
        dirReader.readEntries(function(entries) {
            filterDirs = ["src", "target", ".git", ".settings", "reports", "env-install"];
            entries = $.grep(entries, function(entry) { return $.inArray(entry.name, filterDirs) < 0; });

            var isProject = false;
            for (var i=0; i<entries.length; i++) {
                isProject = traverseFileTree(entries[i], path + entry.name + "/");
                if (isProject) {
                    console.log(path + entry.name);
                    break;
                }
            }
            if (isProject) {
                var classpathFile = getEntryByName(entries, ".classpath");
                if (classpathFile) {
                    classpathFile.file(function(file) {
                        parseContent(file, getPaths, path);
                    });
                } else {
                    console.log("No .classpath");
                }

                var projectFile = getEntryByName(entries, ".project");
                if (projectFile) {
                    projectFile.file(function(file) {
                        parseContent(file, getName, path);
                    });
                } else {
                    console.log("No .project");
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

function getPaths(evt) {
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
    console.log(xmlDoc, fpaths);
    //edgesStack.push({'out': ""})
}

function getName(evt) {
    var xmlDoc = $.parseXML(evt.target.result);
    var name = $($("projectDescription > name", xmlDoc)[0]).text();
    console.log(xmlDoc, name);
    sigInst.addNode(
            name, {
            'x': Math.random(),
            'y': Math.random(),
            });
}

// Setup the dnd listeners.
//$("#drop_zone").bind({'dragover': handleDragOver, 'drop': handleFileSelect});
var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
