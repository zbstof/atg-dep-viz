function handleFileSelect(evt) {
    evt.preventDefault();

    var items = evt.dataTransfer.items;

    for (var i = 0, item; item = items[i]; i++) {
        //file = item.getAsFile();
        entry = item.webkitGetAsEntry();
        traverseFileTree(entry, undefined, confFilter);
    }
}

function handleDragOver(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function confFilter(item) {
    var glob = /^.*\.rb$/ // ruby files
    var seek_vars = [".classpath", ".project"];
    var filter_dirs = ["target", "src"];
    if (filter_dirs.indexOf(item.name) != -1)
        return false; // It's not on these dirs
    if (seek_vars.indexOf(item.name) != -1)
        return true; // Got one!
    //if (glob.test(item.name))
        //return true; // And another one!
    if (item.isFile)
        return false; // It's not on the hit list
    return true; // recurse further
}

function traverseFileTree(entry, path, filter) {
    path = path || "";
    filter = filter || function(entry) {return true;}

    if (!filter(entry)) 
        return;
    if (entry.isFile) {
        // Get file
        entry.file(function(file) {
            parseContent(file, path);
        });
    } else if (entry.isDirectory) {
        // Get folder contents
        var dirReader = entry.createReader();
        // TODO: account for the fact that .readEntries is
        // not guaranteed to return all directory's entities
        dirReader.readEntries(function(entries) {
            for (var i=0; i<entries.length; i++) {
                traverseFileTree(entries[i], path + entry.name + "/", filter);
            }
        });
    }
}

function parseContent(file, path) {
    console.log("File:", path + file.name);
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
        return function(e) {
            var xmlDoc = $(e.target.result.toString());
            console.log(xmlDoc, theFile, path + theFile.name);
        };
    })(file);

    reader.readAsText(file);
}

// Setup the dnd listeners.
var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
