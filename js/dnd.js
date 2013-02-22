function handleFileSelect(evt) {
    evt.preventDefault();

    var items = evt.dataTransfer.items;

    for (var i = 0, item; item = items[i]; i++) {
        //file = item.getAsFile();
        entry = item.webkitGetAsEntry();
        traverseFileTree2(entry);
    }
}

function handleDragOver(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function traverseFileTree2(entry, path) {
    path = path || "";
    if (entry.isFile) {
        filterFiles = [".classpath", ".project"];
        if ($.inArray(entry.name, filterFiles) < 0)
            return;
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
            filterDirs = ["src", "target", ".git", ".settings", "reports", "env-install"];
            entries = $.grep(entries, function(entry) { return $.inArray(entry.name, filterDirs) < 0; });

            for (var i=0; i<entries.length; i++) {
                traverseFileTree2(entries[i], path + entry.name + "/");
            }
        });
    }
}

function handleFileChoose(evt) {
    var files = evt.target.files; // FileList object

    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
            return function(e) {
                // Render thumbnail.
                var li = document.createElement('li');
                $(li).text(e.target.result);
                $("#parseList").before(li);
                var xmlDoc = $.parseXML(e.target.result);
                console.log(xmlDoc);
                var xml = $("classpathentry", xmlDoc);
                // all modules
                var paths = []
                $.each(xml, function(i, el) { 
                    if(el.getAttribute("kind") === "var") 
                    paths.push(el.getAttribute("path"))
                });
                //console.log(paths);
                // our modules
                var fpaths = paths.filter(function(el) { return el.indexOf("kf/atg/module") !== -1 })
                console.log(fpaths);
            };
        })(f);

        // Read in the image file as a data URL.
        reader.readAsText(f);
    }
}

function parseContent(file, path) {
    console.log("File:", path + file.name);
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
        return function(e) {
            //var xmlDoc = $(e.target.result.toString());
            //console.log(xmlDoc, theFile, path + theFile.name);
        };
    })(file);

    reader.readAsText(file);
}

// Setup the dnd listeners.
//$("#drop_zone").bind({'dragover': handleDragOver, 'drop': handleFileSelect});
var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);

//$("#files").change(handleFileChoose);
document.getElementById('files').addEventListener('change', handleFileChoose, false);
