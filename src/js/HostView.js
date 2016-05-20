/* global ProgressBar,$ */

var HostView = (function () {
    "use strict";


    /******************************************************************/
    /*                        V A R I A B L E S                       */
    /******************************************************************/

    var types = {
        "cpu": {
            color: "#009EFF"
        },
        "ram": {
            color: "#C971CC"
        },
        "disk": {
            color: "#60D868"
        }
    };


    /*****************************************************************
    *                     C O N S T R U C T O R                      *
    *****************************************************************/

    function HostView () {}


    /******************************************************************/
    /*                P R I V A T E   F U N C T I O N S               */
    /******************************************************************/

    function drawChart (name, type, data, tooltip, show) {
        var id = name + "-" + type;
        var showC = (show) ? "" : "myhide";

        $("<div></div>")
            .prop("id", id)
            .addClass(type + " measure " + showC)
            .css("color", types[type].color)
            .appendTo("#" + name + "-container")
            .prop("title", tooltip)
            .tooltipster();

        var progress = new ProgressBar.Line("#" + id, {
            color: types[type].color,
            trailColor: "#ddd",
            strokeWidth: 5,
            svgStyle: {
                width: "100%"
            }
        });

        progress.animate(data);
    }


    /******************************************************************/
    /*                 P U B L I C   F U N C T I O N S                */
    /******************************************************************/

    HostView.prototype.build = function (region, host, data, status, minvalues, comparef, filtertext) {
        var id = region + "-" + host;
        var measures = data.measures[0];

        var cpuData = parseFloat(measures.percCPULoad.value);
        var ramData = parseFloat(measures.percRAMUsed ? measures.percRAMUsed.value : 0.0);
        var diskData = parseFloat(measures.percDiskUsed ? measures.percDiskUsed.value : 0.0);

        // var uptime = measures.sysUptime ? measures.sysUptime.value : 0.0;
        // var owdStatus = measures.owd_status ? measures.owd_status.value : 0.0;
        // var bwdStatus = measures.bwd_status ? measures.bwd_status.value : 0.0;

        var cpuText = cpuData.toFixed(2) + "% CPU load";
        var ramText = ramData.toFixed(2) + "% RAM used";
        var diskText = diskData.toFixed(2) + "% Disk used";

        // If some of the data are greater than the min values, the host will be showed, if not it will be hidden
        var hideHost = comparef(cpuData > minvalues.cpu, ramData > minvalues.ram, diskData > minvalues.disk) ? "" : "hide";
        var hideFilter = filtertext !== "" && id.toLowerCase().indexOf(filtertext) < 0 ? "filterhide" : "";

        $("#" + id).remove(); // Remove old ones with this id :)

        $("<div></div>")
            .prop("id", id)
            .addClass("flexitem hostChart noselect " + region + " " + hideHost + " " + hideFilter)
            .appendTo("#regionContainer")
            .prop("title", "Host " + host + " of the region " + region)
            .tooltipster({
                position: "bottom"
            });
        $("<div>" + id + "</div>")
            .addClass("regionTitle")
            .appendTo("#" + id);
        $("<div></div>")
            .prop("id", id + "-container")
            .addClass("measures-container")
            .appendTo("#" + id);


        drawChart(id, "cpu", cpuData/100, cpuText, status.cpu);
        drawChart(id, "ram", ramData/100, ramText, status.ram);
        drawChart(id, "disk", diskData/100, diskText, status.disk);

        return {
            id: id,
            data: {
                cpu: cpuData,
                ram: ramData,
                disk: diskData
            }
        };
    };

    return HostView;

})();
