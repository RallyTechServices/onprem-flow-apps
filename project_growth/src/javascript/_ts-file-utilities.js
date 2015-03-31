Ext.define('Rally.technicalservices.FileUtilities', {
    singleton: true,
    logger: new Rally.technicalservices.Logger(),
    saveCSVToFile:function(csv,file_name,type_object){
        if (type_object == undefined){
            type_object = {type:'text/csv;charset=utf-8'};
        }
        var blob = new Blob([csv],type_object);
        saveAs(blob,file_name);
    },
    saveHTMLToFile:function(html,file_name,type_object){
        if (type_object == undefined){
            type_object = {type:'text/html;charset=utf-8'};
        }
        var blob = new Blob([html],type_object);
        saveAs(blob,file_name);
    },

    saveTextAsFile: function(textToWrite, fileName)
    {
        var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
        var fileNameToSaveAs = fileName;

        var downloadLink = document.createElement("a");
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "Download File";
        if (window.URL != null)
        {
            // Chrome allows the link to be clicked
            // without actually adding it to the DOM.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        }
        else
        {
            // Firefox requires the link to be added to the DOM
            // before it can be clicked.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
            downloadLink.onclick = Rally.technicalservices.FileUtilities.destroyClickedElement;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
        }
        downloadLink.click();
    },
    destroyClickedElement: function(event)
    {
        document.body.removeChild(event.target);
    },
    convertDataArrayToCSVText: function(data_array, requestedFieldHash){
       
        var text = '';
        Ext.each(Object.keys(requestedFieldHash), function(key){
            text += requestedFieldHash[key] + ',';
        });
        text = text.replace(/,$/,'\n');
        
        Ext.each(data_array, function(d){
            Ext.each(Object.keys(requestedFieldHash), function(key){
                if (d[key]){
                    if (typeof d[key] === 'object'){
                        if (d[key].FormattedID) {
                            text += Ext.String.format("\"{0}\",",d[key].FormattedID ); 
                        } else {
                            text += Ext.String.format("\"{0}\",",d[key].Name );                    
                        }
                    } else {
                        text += Ext.String.format("\"{0}\",",d[key] );                    
                    }
                } else {
                    text += ',';
                }
            },this);
            text = text.replace(/,$/,'\n');
        },this);
        return text;
    }
});