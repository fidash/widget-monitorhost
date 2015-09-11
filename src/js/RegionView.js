/* global Utils,google,Resizable */

var RegionView = (function () {
    "use strict";

    /*****************************************************************
    *                        V A R I A B L E S                       *
    *****************************************************************/

    var chartTypes = {
        "ip": drawIpChart,
        "ram": drawRamChart,
        "core": drawCoreChart,
        "disk": drawDiskChart
    };

    var charts = {
        coreChart: {},
        ramChart: {},
        diskChart: {},
        ipChart: {}
    };

    var pieChartOptions = {
        pieHole: 0.4,
        width: window.innerWidth/2,
        height: (window.innerHeight/2.3) - 27,
        chartArea:{left:0,top:20,width:"100%",height:"100%"}
    };

    var parentResize;
    var visitedRegions = {};


    /****************************************************************/
    /*                    C O N S T R U C T O R                     */
    /****************************************************************/

    function RegionView () {

        parentResize = Object.create(Resizable.prototype).resize;

    }


    /******************************************************************/
    /*                P R I V A T E   F U N C T I O N S               */
    /******************************************************************/

    function getRamOvercommit () {
        return (1 + Math.random()*0.5).toFixed(2);
    }

    function getCPUOvercommit () {
        return (1 + Math.random()*15).toFixed(2);
    }

    function setPieChartData (used, total, unit) {

        used = used > total ? total : used;
        used = used < 0 ? 0 : used;
        var free = parseFloat((total-used).toFixed(2));

        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Used');
        data.addColumn('number', 'Percentage');
        data.addColumn({type: 'string', role: 'tooltip'});
        data.addRows([
            ['Used', used, used + " " + unit + " used"],
            ['Free', free, free + " " + unit + " free"]
        ]);

        return data;

    }

    function drawDiskChart (rawData) {

        var diskChart = charts.diskChart;
        var total = parseInt(rawData.measures[0].nb_disk);
        var used = parseInt(rawData.measures[0].percDiskUsed * total);

        var displayableTotal = parseFloat((Math.floor(((total/1024) * 100)) / 100).toFixed(2));
        var displayableUsed = parseFloat((Math.floor(((used/1024) * 100)) / 100).toFixed(2));

        var options = {
            slices: {
                0: {color: 'orange'},
                1: {color: 'silver'}
            },
            title: "Disk Capacity: " + displayableTotal + " TiB"
        };

        diskChart.data = setPieChartData(displayableUsed, displayableTotal, "TiB");
        diskChart.options = Utils.mergeOptions(pieChartOptions, options);
        diskChart.chart = new google.visualization.PieChart($('#disk-chart')[0]);
        diskChart.chart.draw(diskChart.data, diskChart.options);

    }

    function drawRamChart (rawData) {

        var ramChart = charts.ramChart;
        var total = parseInt(rawData.measures[0].nb_ram);
        var used = parseInt(rawData.measures[0].percRAMUsed * total);

        var displayableTotal = parseFloat((Math.floor(((total/1024) * 100)) / 100).toFixed(2));
        var displayableUsed = parseFloat((Math.floor(((used/1024) * 100)) / 100).toFixed(2));

        var options = {
            slices: {
                0: {color: 'green'},
                1: {color: 'silver'}
            },
            title: "RAM Capacity: " + displayableTotal + " GiB"
        };

        ramChart.data = setPieChartData(displayableUsed, displayableTotal, "GiB");
        ramChart.options = Utils.mergeOptions(pieChartOptions, options);
        ramChart.chart = new google.visualization.PieChart($('#ram-chart')[0]);
        ramChart.chart.draw(ramChart.data, ramChart.options);

    }

    function drawIpChart (rawData) {

        var ipChart = charts.ipChart;
        var total = parseInt(rawData.measures[0].ipTot);
        var used = parseInt(rawData.measures[0].ipAllocated);
        var options = {
            slices: {
                0: {color: 'blue'},
                1: {color: 'silver'}
            },
            title: "Total IPs: " + total
        };

        ipChart.data = setPieChartData(used, total, "IPs");
        ipChart.options = Utils.mergeOptions(pieChartOptions, options);
        ipChart.chart = new google.visualization.PieChart($('#ip-chart')[0]);
        ipChart.chart.draw(ipChart.data, ipChart.options);

    }

    function drawCoreChart (rawData) {

        var coreChart = charts.coreChart;
        var total = parseInt(rawData.measures[0].nb_cores);
        var used = parseInt(rawData.measures[0].nb_cores_used);
        var options = {
            slices: {
                0: {color: '#009EFF'},
                1: {color: 'silver'}
            },
            title: "Total vCPUs: " + total
        };

        coreChart.data = setPieChartData(used, total, "VCPUs");
        coreChart.options = Utils.mergeOptions(pieChartOptions, options);
        coreChart.chart = new google.visualization.PieChart($('#core-chart')[0]);
        coreChart.chart.draw(coreChart.data, coreChart.options);

    }

    function drawOvercommits (region) {

        var overcommit = region in visitedRegions ? visitedRegions[region] : {ram: getRamOvercommit(), cpu: getCPUOvercommit()};
        
        $('<div>')
            .text('RAM overcommit ratio: ' + overcommit.ram)
            .css('top', '51px')
            .css('position', 'absolute')
            .prependTo('#ram-chart');

        $('<div>')
            .text('CPU overcommit ratio: ' + overcommit.cpu)
            .css('position', 'absolute')
            .prependTo('#core-chart');

        // Increase padding so CPU overcommit is visible
        $('#core-chart > div').last().css('padding-top', '17px');

        visitedRegions[region] = overcommit;
    }


    /******************************************************************/
    /*                 P U B L I C   F U N C T I O N S                */
    /******************************************************************/

    RegionView.prototype.build = function (rawData) {

        drawCoreChart(rawData);
        drawIpChart(rawData);
        drawRamChart(rawData);
        drawDiskChart(rawData);

        drawOvercommits(rawData.id);

        parentResize(charts, {'heightInPixels': 1});

    };

    RegionView.prototype.resize = function (newValues) {

        parentResize(charts, newValues);

    };

    return RegionView;

})();