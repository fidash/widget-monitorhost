/* global google,require,RegionView,HostView,Utils */

var Monitoring = (function () {
    "use strict";

    var OAuth = require('oauth');
    var OAuth2 = OAuth.OAuth2;

    /***  AUTHENTICATION VARIABLES  ***/
    var ConsumerKey     = "2703";   // DO NOT COMMIT
    var ConsumerSecret  = "c67959c060374bfe0e683328d04fe910282fa161d649de5398151cafbeb81357a7454121f2055e10be04106f79c9eba08c6180f5b38b241042dfac552594db66";   // DO NOT COMMIT
    var username        = "bgrana@conwet.com";   // DO NOT COMMIT
    var password        = "testPassword42";   // DO NOT COMMIT
    var url             = "http://130.206.84.4:1028/monitoring/regions/";
    var IDMaddress      = "https://account.lab.fiware.org/";

    
    var views = {
        'region': RegionView,
        'host': HostView
    };


    /*****************************************************************
    *                     C O N S T R U C T O R                      *
    *****************************************************************/

    function Monitoring () {

        this.token  = "";
        this.view   = $('#view').val();
        this.region = $('#id_region').val();
        this.hostId = $('#host').val();

    }


    /******************************************************************/
    /*                P R I V A T E   F U N C T I O N S               */
    /******************************************************************/

    function authenticate (oauth2) {
        oauth2.getOAuthAccessToken( '', { 'grant_type':'password', 'username': username, 'password': password }, manageCred.bind(this));
    }

    function manageCred(e, access_token, refresh_token, results){

        this.token = access_token;
        getRawData.call(this, access_token);

    }

    function getRawData (token){
        var bearer = window.btoa(token);

        var host = this.view === "host" ? "/vms/" + this.hostId : "";
        
        var options = {
            url: url + this.region + host,
            method:"GET",
            headers: {
                'Authorization': 'Bearer ' + bearer
            },
            success: function(data){
                this.current = new views[this.view]();
                this.current.build(data);
            }.bind(this)
        };

        $.ajax(options);

    }


    /******************************************************************/
    /*                 P U B L I C   F U N C T I O N S                */
    /******************************************************************/

    Monitoring.prototype = {

        init: function () {

            var oauth2 = new OAuth2(ConsumerKey, ConsumerSecret, IDMaddress,  null, 'oauth2/token',  null);
            oauth2._customHeaders = {Authorization: 'Basic '+ window.btoa(ConsumerKey + ":" + ConsumerSecret)};

            // Load the Visualization API and the piechart package.
            google.load("visualization", "1", {packages:["corechart"]});

            google.setOnLoadCallback(authenticate.bind(this, oauth2));

            $('#view').change(function () {

                var newView = $('#view').val();

                if (newView !== this.view) {
                    $('#region-view').toggleClass('hide');
                    $('#host-view').toggleClass('hide');
                }

                this.view = newView;
                this.hostId = $('#host').val();
                getRawData.call(this, this.token);

            }.bind(this));

            $('#auth').click(authenticate.bind(this));

            $('#id_region').change(function () {
                
                this.region = $('#id_region').val();
                getRawData.call(this, this.token);

            }.bind(this));

            $('#host-button').click(function () {

                this.hostId = $('#host').val();
                getRawData.call(this, this.token);

            }.bind(this));

            // $('#refresh').click(function () {
            //     getRawData.call(this, this.token);
            // });

            MashupPlatform.widget.context.registerCallback(function (newValues) {
                this.current.resize(newValues);
            }.bind(this));

        }

    };

    return Monitoring;

})();