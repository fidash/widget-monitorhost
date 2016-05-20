/* global $,MashupPlatform,HostView,FIDASHRequests */
var Monitoring = (function () {
    "use strict";

    /***  AUTHENTICATION VARIABLES  ***/
    var url = "http://130.206.84.4:11027/monitoring/regions/";

    /*****************************************************************
    *                     C O N S T R U C T O R                      *
    *****************************************************************/

    function Monitoring() {
        this.regions = [];
        this.torequest = [];

        this.view   = "region";
        this.filtertext = "";
        this.hostId = $("#host").val();
        this.hostsByRegion = {};
        this.options = {
            orderby: "",
            orderinc: "",
            data: {}
        };
        this.measures_status = {
            cpu: true,
            ram: true,
            disk: true
        };

        this.minvalues = {
            cpu: 0,
            ram: 0,
            disk: 0
        };

        this.variables = {
            regionSelected: MashupPlatform.widget.getVariable("regionSelected"),
            cpuOn: MashupPlatform.widget.getVariable("cpuOn"),
            ramOn: MashupPlatform.widget.getVariable("ramOn"),
            diskOn: MashupPlatform.widget.getVariable("diskOn"),
            sort: MashupPlatform.widget.getVariable("sort"),
            closed: MashupPlatform.widget.getVariable("closed")
        };

        this.comparef = or;

        handlePreferences.call(this);

    }

    /******************************************************************
    *                P R I V A T E   F U N C T I O N S               *
    ******************************************************************/

    function handlePreferences() {
        var checkValue = function checkValue(value, name) {
            if (Number.isNaN(value)) {
                MashupPlatform.widget.log("The preference for " + name + " is not a number.");
                return 0;
            }

            if (value < 0 || value > 100) {
                MashupPlatform.widget.log("The preference for " + name + " are not in the limits");
                return 0;
            }

            return value;
        };

        var cpu = checkValue(parseFloat(MashupPlatform.prefs.get("min-cpu")) || 0, "CPU");
        var ram = checkValue(parseFloat(MashupPlatform.prefs.get("min-ram")) || 0, "RAM");
        var disk = checkValue(parseFloat(MashupPlatform.prefs.get("min-disk")) || 0, "Disk");
        this.minvalues = {
            cpu: cpu,
            ram: ram,
            disk: disk
        };

        this.comparef = (parseInt(MashupPlatform.prefs.get("numbermin")) === 1) ? and : or;

        updateHiddenHosts.call(this);
    }

    var or = function or() {
        var value = false;

        for (var i = 0; i < arguments.length; i++) {
            value = value || arguments[i];
        }

        return value;
    };

    var and = function and() {
        var value = true;
        for (var i = 0; i < arguments.length; i++) {
            value = value && arguments[i];
        }

        return value;
    };

    var updateHiddenHosts = function updateHiddenHosts() {
        // Use search bar?
        var mincpu = this.minvalues.cpu,
            minram = this.minvalues.ram,
            mindisk = this.minvalues.disk;

        $(".hostChart").each(function (index, host) {
            var id = host.id; // $(host).prop("id");
            var data = this.options.data[id];
            if (!data) {
                return;
            }

            var cpu = parseFloat(data.cpu);
            var ram = parseFloat(data.ram);
            var disk = parseFloat(data.disk);

            var $elem = $(host);
            if (this.comparef(cpu > mincpu, ram > minram, disk > mindisk)) {
                $elem.show();
            } else {
                $elem.hide();
            }
        }.bind(this));
    };

    function drawHosts(regions) {
        // $("#regionContainer").empty();
        // diff and only get news, and remove/hide unselected?
        if (regions.length > this.last_regions.length) {
            // add
            diffArrays(regions, this.last_regions)
                .forEach(drawHostsRegion.bind(this));
        } else if (regions.length < this.last_regions.length) {
            // remove
            diffArrays(this.last_regions, regions)
                .forEach(removeRegion.bind(this));
        }

        // regions.forEach(drawHost.bind(this));
        this.variables.regionSelected.set(regions.join(","));
        this.last_regions = regions;
    }

    function removeRegion(region) {
        // Remove all hosts from the region
        $("." + region).remove();
        this.torequest = this.torequest.filter(function (x) {
            return x.region !== region;
        });
    }

    function drawHostsRegion(region) {
        var newurl = url + region + "/hosts";

        FIDASHRequests.get(newurl, function (err, data) {
            if (err) {
                window.console.log(err);
                MashupPlatform.widget.log("The API seems down (Hosts from region " + region + " ): " + err.statusText);

                return;
            }

            var startR = this.torequest.length === 0;

            // Data is a list of hosts, let's do one request by host
            var hosts = [];
            data.hosts.forEach(function (x) {
                if (!!x.id && x.id !== "None") {
                    hosts.push(x.id);
                    this.torequest.push({region: region, id: x.id});
                }
            }.bind(this));

            this.hostsByRegion[region] = hosts;

            if (startR) {
                startRequests.call(this);
            }

            // hosts.forEach(drawHost.bind(this, region));
            // sortRegions.call(this);
        }.bind(this));
    }

    function drawHost(region, host) {
        var newurl  = url + region + "/hosts/" + host;
        FIDASHRequests.get(newurl, function (err, data) {
            if (err) {
                window.console.log(err);
                MashupPlatform.widget.log("The API seems down (Host " + host + " from region " + region + "): " + err.statusText);
                return;
            }
            if (isRegionSelected(region)) {
                try {
                    var hdata = new HostView().build(region, host, data, this.measures_status, this.minvalues, this.comparef, this.filtertext);
                    this.options.data[hdata.id] = hdata.data;
                    sortRegions.call(this);
                } catch(error) {
                    console.log("Error building data for host " + host + " in region " + region);
                }
            }

            startRequests.call(this);

        }.bind(this));
    }

    function startRequests () {
        if (this.torequest.length === 0) {
            return;
        }
        var elem = this.torequest.shift();
        drawHost.call(this, elem.region, elem.id);
    }


    function fillRegionSelector(regions) {
        regions.forEach(function (region) {
            $("<option>")
                .val(region)
                .text(region)
                .appendTo($("#region_selector"));
        });

        $("#region_selector")
            .prop("disabled", false);
        $("#region_selector").selectpicker({ title: "Choose Region" });
        $("#region_selector").selectpicker("refresh");
    }

    function diffArrays(a, b) {
        return a.filter(function (i) {return b.indexOf(i) < 0;});
    }

    function mergeUnique(a, b) {
        return a.concat(b.filter(function (item) {
            return a.indexOf(item) < 0;
        }));
    }

    function getAllOptions() {
        return $("#region_selector option").map(function (x, y) {
            return $(y).text();
        }).toArray();
    }

    function filterNotRegion(regions) {
        var ops = getAllOptions();
        return regions.filter(function (i) {
            return ops.indexOf(i) >= 0;
        });
    }

    function isRegionSelected(region) {
        return $("#region_selector").val().indexOf(region) > -1;
    }


    function setEvents() {
        $("#region_selector").change(function () {
            this.regions = $("#region_selector").val() || [];
            this.hostId = $("#host").val();
            this.last_regions = this.last_regions || [];
            drawHosts.call(this, this.regions);
        }.bind(this));

        $("#filterbox").keyup(function () {
            var text = $(arguments[0].target).val().toLowerCase();
            this.filtertext = text;
            if (text === "") {
                $(".filterhide").removeClass("filterhide");
            } else {
                $(".hostChart .regionTitle").each(function () {
                    var n = $(this).text();
                    var i = n.toLowerCase().indexOf(text);
                    if (i < 0) {
                        $("#" + n).addClass("filterhide");
                    } else {
                        $("#" + n).removeClass("filterhide");
                    }
                });
            }
        }.bind(this));

        $(".slidecontainer").click(function (x) {
            // var elem = $(x.target);
            // var closing = elem.text() === "^";
            var closing = this.variables.closed.get() === "true";
            closing = !closing;
            this.variables.closed.set("" + closing);
            if (closing) {
                $(".navbar").collapse("hide");
                $(".slidecontainer").removeClass("open").addClass("closed");
                $("#regionContainer").css("margin-top", "6px");
                // elem.text("v");
            } else {
                $(".navbar").collapse("show");
                $(".slidecontainer").removeClass("closed").addClass("open");
                $("#regionContainer").css("margin-top", "93px");
                // elem.text('^');
            }

            return false;
        }.bind(this));

        $("input[type='checkbox']").on("switchChange.bootstrapSwitch", function (e, data) {
            var type = e.target.dataset.onText;
            type = type.toLowerCase();

            var newst = !this.measures_status[type];
            this.measures_status[type] = newst;
            this.variables[type + "On"].set(newst.toString());
            if (newst) {
                // $("." + type).removeClass("hide");
                $("." + type).removeClass("myhide");
            } else {
                // $("." + type).addClass("hide");
                $("." + type).addClass("myhide");
            }

            // $("." + type).toggleClass("hide");
        }.bind(this));

        $(".sort").on("click", function (e, data) {
            var rawid = "#" + e.target.id;
            var id = e.target.id.replace(/sort$/, "");
            var rawmode = e.target.classList[3];
            var mode = rawmode.replace(/^fa-/, "");
            var oid = this.options.orderby;
            var orawid = "#" + oid + "sort";
            var newmode = "";
            if (id === oid) {
                if (mode === "sort") {
                    newmode = "sort-desc";
                    $(rawid).removeClass("fa-sort").addClass("fa-sort-desc");
                } else if (mode === "sort-desc") {
                    newmode = "sort-asc";
                    $(rawid).removeClass("fa-sort-desc").addClass("fa-sort-asc");
                } else {
                    newmode = "sort-desc";
                    $(rawid).removeClass("fa-sort-asc").addClass("fa-sort-desc");
                }
            } else {
                newmode = "sort-desc";
                if (oid !== "") {
                    var oldclass = $(orawid).attr("class").split(/\s+/)[3];
                    $(orawid).removeClass(oldclass).addClass("fa-sort");
                }

                $(rawid).removeClass(rawmode).addClass("fa-sort-desc");
            }

            this.options.orderby = id;
            this.options.orderinc = newmode;
            this.variables.sort.set(id + "//" + newmode);
            sortRegions.call(this);
        }.bind(this));
    }

    function sortRegions() {
        var by = this.options.orderby;
        var inc = this.options.orderinc;
        var data = this.options.data;
        if (inc === "") {
            return;
        }

        $(".hostChart").sort(function (a, b) {
            var dataA = data[a.id],
                dataB = data[b.id];
            var itemA = dataA[by],
                itemB = dataB[by];
            if (inc === "sort-asc") {
                // return itemA > itemB;
                return parseFloat(itemA) - parseFloat(itemB);
            }

            return parseFloat(itemB) - parseFloat(itemA);

            // return itemB > itemA;
        }).appendTo("#regionContainer");
    }

    function calcMinHeight() {
        var minH = 9999;

        $(".regionChart").forEach(function (v) {
            if (v.height() < minH) {
                minH = v.height();
            }
        });
    }

    function getRegionsMonitoring() {
        FIDASHRequests.get(url, function (err, data) {
            if (err) {
                window.console.log(err);
                MashupPlatform.widget.log("The API seems down (Get regions): " + err.statusText);

                // The API are down
                // var regionsT = ["Spain2", "Berlin2"];
                // fillRegionSelector(regionsT.sort());
                // selectSavedRegions.call(this);
                // this.regions = $("#region_selector").val() || [];
                return;
            }

            var regions = [];

            data._embedded.regions.forEach(function (region) {
                regions.push(region.id);
            });

            fillRegionSelector(regions.sort());
            selectSavedRegions.call(this);
            this.regions = $("#region_selector").val() || [];
        }.bind(this));
    }

    function receiveRegions(regionsRaw) {
        var regions = JSON.parse(regionsRaw);

        // Check it's a list
        var newRegions = filterNotRegion(regions);

        // Set in selector
        $("#region_selector").selectpicker("val", newRegions);

        this.regions = newRegions;
        this.last_regions = []; // Reset regions! :)
        // Empty before override
        $("#regionContainer").empty();
        drawHosts.call(this, this.regions);
    }

    function handleSwitchVariable(name) {
        if (this.variables[name + "On"].get() === "") {
            this.variables[name + "On"].set("true");
        } else if (this.variables[name + "On"].get() !== "true") {
            this.measures_status[name] = false;
            $("." + name).addClass("myhide");
            $("#" + name + "Switch input[name='select-charts-region']").bootstrapSwitch("state", false, true);
        }
    }

    function selectSavedRegions() {
        // Get regions
        var regionsS = this.variables.regionSelected.get();
        var regions = regionsS.split(",");
        receiveRegions.call(this, JSON.stringify(regions));
    }

    function handleVariables() {
        handleSwitchVariable.call(this, "cpu");
        handleSwitchVariable.call(this, "ram");
        handleSwitchVariable.call(this, "disk");

        if (this.variables.closed.get() === "true") {
            $(".navbar").collapse("hide");
            $(".slidecontainer").removeClass("open").addClass("closed");
            $("#regionContainer").css("margin-top", "6px");
            // $(".btn-slide").text("v");
        } else {
            $(".navbar").collapse("show");
            $(".slidecontainer").removeClass("closed").addClass("open");
            $("#regionContainer").css("margin-top", "93px");
        }

        var sort = this.variables.sort.get();
        var matchS = sort.match(/^(.+)\/\/(.+)$/);
        if (sort && matchS) {
            $("#" + matchS[1] + "sort").addClass("fa-" + matchS[2]);
            this.options.orderby = matchS[1];
            this.options.orderinc = matchS[2];
            sortRegions.call(this);
        }
    }

    /******************************************************************/
    /*                 P U B L I C   F U N C T I O N S                */
    /******************************************************************/

    Monitoring.prototype = {
        init: function () {
            $(".navbar").collapse();
            handleVariables.call(this);

            setEvents.call(this);

            getRegionsMonitoring.call(this);

            // Initialize switchs
            $("[name='select-charts-region']").bootstrapSwitch();

            // $("[name='select-charts-host']").bootstrapSwitch();

            MashupPlatform.prefs.registerCallback(handlePreferences.bind(this));
            MashupPlatform.wiring.registerCallback("regions", receiveRegions.bind(this));
        }
    };

    return Monitoring;

})();
