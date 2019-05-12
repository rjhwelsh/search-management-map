var assetLines = {};
var layerControl;
// eslint-disable-next-line no-unused-vars
var myMap;

function overlayAdd(name, layer) {
    layerControl.addOverlay(layer, name);
}

function assetPathUpdate(name)
{
    if (!(name in assetLines)) {
        var track = L.polyline([], {color: 'red'});
        assetLines[name] = {track: track, updating: false, lastUpdate: null, path: []};
        overlayAdd(name, track);
    }
    var assetLine = assetLines[name]
    if (assetLine.updating) { return; }
    assetLine.updating = true;

    var url = "/data/assets/" + name + "/position/history/?oldest=last";
    if(assetLine.lastUpdate != null) {
        url = url + "&from=" + assetLine.lastUpdate
    }

    $.ajax({
        type: "GET",
        url: url,
        success: function(route) {
            for(var f in route.features)
            {
                var lon = route.features[f].geometry.coordinates[0];
                var lat = route.features[f].geometry.coordinates[1];
                assetLine.path.push(L.latLng(lat, lon));
                assetLine.lastUpdate = route.features[f].properties.timestamp;
            }
            assetLine.track.setLatLngs(assetLine.path);
            assetLine.updating = false;
        },
        error: function() {
            assetLine.updating = false;
        },
    });
}

function assetUpdate(asset, oldLayer) {
    var assetName = asset.properties.asset;
    assetPathUpdate(assetName);

    if (!oldLayer) {return; }

    var coords = asset.geometry.coordinates;

    var popupContent = '';
    popupContent += '<dl class="row"><dt class="asset-label col-sm-3">Asset</dt><dd class="asset-name col-sm-9">' + assetName + '</dd>';

    popupContent += '<dt class="asset-lat-label col-sm-3">Lat</dt><dd class="asset-lat-val col-sm-9">' + deg_to_dm(coords[1], true) + '</dd>';
    popupContent += '<dt class="asset--lng-label col-sm-3">Long</dt><dd class="asset-lng-val col-sm-9">' + deg_to_dm(coords[0]) + '</dd>';

    var alt = asset.properties.alt;
    var heading = asset.properties.heading;
    var fix = asset.properties.fix;

    if (alt) {
        popupContent = popupContent + '<dt class="asset-alt-label col-sm-3">Altitude</dt><dd class="asset-alt-val col-sm-9">' + alt + 'm</dd>';
    }

    if (heading) {
        popupContent = popupContent + '<dt class="asset-heading-label col-sm-3">Heading</dt><dd class="asset-heading-val col-sm-9">' + heading + ' &deg;</dd>';
    }

    if (fix) {
        popupContent = popupContent + '<dt class="asset-fix-label col-sm-3">Fix</dt><dd class="asset-fix-val col-sm-9">' + fix + 'd</dd>';
    }

    popupContent += '</dl>';

    oldLayer.bindPopup(popupContent, { minWidth: 200});

    if (asset.geometry.type === 'Point') {
        var c = asset.geometry.coordinates;
        oldLayer.setLatLng([c[1], c[0]]);
        return oldLayer;
    }
}

function assetCreate(asset) {
    var assetName = asset.properties.asset;

    if(!(assetName in assetLines))
    {
        /* Create an overlay for this object */
        var track = L.polyline([], {color: 'red'});
        assetLines[assetName] = {track: track, updating: false};
        overlayAdd(assetName, track);
    }
}

function poiCreate(poi, layer) {
    var POILabel = poi.properties.label;
    var poiID = poi.properties.pk;
    var coords = poi.geometry.coordinates;

    var popupContent = '<dl class="poi row"><dt class="poi-label col-sm-2">POI</dt><dd class="poi-name col-sm-10">' + POILabel + '</dd>';

    popupContent += '<dt class="poi-lat-label col-sm-2">Lat</dt><dd class="poi-lat-val col-sm-10">' + deg_to_dm(coords[1], true) + '</dd>';
    popupContent += '<dt class="poi-lng-label col-sm-2">Long</dt><dd class="poi-lng-val col-sm-10">' + deg_to_dm(coords[0]) + '</dd></dl>';

    popupContent += '<div class="btn-group"><button class="btn btn-default" onClick="L.POIAdder(myMap, L.latLng(' + coords[1] + ', ' + coords[0] + '),' + poiID + ',\'' + POILabel + '\');">Move</button>'
    popupContent += '<button class="btn btn-danger" onClick="$.get(\'/data/pois/' + poiID + '/delete/\')">Delete</button>'
    popupContent += '<button class="btn btn-default" onClick="L.SearchAdder(myMap, \'point\', ' + poiID + ');">Create Search</button></div>'

    layer.bindPopup(popupContent);
}

function userPolygonCreate(poly, layer) {
    var PolyLabel = poly.properties.label;
    var PolyID = poly.properties.pk;
    var coords = poly.geometry.coordinates;

    var popupContent = '<dl class="polygon row"><dt class="polygon-label col-sm-3">Polygon</dt><dd class="polygon-name col-sm-9">' + PolyLabel + '</dd></dl>';

    var pointList = '';
    var i = 0;
    for (i = 0; i < (coords[0].length - 1); i++) {
        var point = coords[0][i];
        pointList += 'L.latLng(' + point[1] + ', ' + point[0] + '), ';
    }

    popupContent += '<div class="btn-group"><button class="btn btn-default" onClick="L.PolygonAdder(myMap, [' + pointList + '], ' + PolyID + ', \'' + PolyLabel + '\')">Edit</button>';
    popupContent += '<button class="btn btn-danger" onClick="$.get(\'/data/userpolygons/' + PolyID + '/delete/\')">Delete</button></div>'

    layer.bindPopup(popupContent, { minWidth: 200 });
}

function userLineCreate(line, layer) {
    var LineLabel = line.properties.label;
    var LineID = line.properties.pk;
    var coords = line.geometry.coordinates;

    var popupContent = '<dl class="line row"><dt class="line-label col-sm-3">Line</dt><dd class="line-name col-sm-9">' + LineLabel + '</dd></dl>';

    var pointList = '';
    coords.forEach(function(point) {
        pointList += 'L.latLng(' + point[1] + ', ' + point[0] + '), ';
    })

    popupContent += '<dev class="btn-group"><button class="btn btn-default" onClick="L.LineAdder(myMap, [' + pointList + '], ' + LineID + ', \'' + LineLabel + '\')">Edit</button>';
    popupContent += '<button class="btn btn-danger" onClick="$.get(\'/data/userlines/' + LineID + '/delete/\')">Delete</button>'
    popupContent += '<button class="btn btn-default" onClick="L.SearchAdder(myMap, \'line\', ' + LineID + ');">Create Search</button></div>'

    layer.bindPopup(popupContent, { minWidth: 200 });
}

function sectorSearchIncompleteCreate(line, layer) {
    var SectorSearchID = line.properties.pk;
    var SSweepWidth = line.properties.sweep_width;

    var popupContent = 'Sector Search<br />';

    popupContent += "Sweep Width = " + SSweepWidth + "m<br />";

    layer.bindPopup(popupContent);
}

function sectorSearchCompleteCreate(line, layer) {
    var SectorSearchID = line.properties.pk;

    var popupContent = '';

    layer.bindPopup(popupContent);
}


function expandingBoxSearchIncompleteCreate(line, layer) {
    var ExpandingBoxSearchID = line.properties.pk;
    var EBSweepWidth = line.properties.sweep_width;
    var EBFirstBearing = line.properties.first_bearing;
    var EBIterations = line.properties.iterations;

    var popupContent = 'Expanding Box Search<br />';

    popupContent += "Sweep Width = " + EBSweepWidth + "m<br />";
    popupContent += "First Bearing = " + EBFirstBearing + "&#176;T<br />";
    popupContent += "Complete Boxes = " + EBIterations + "<br />";

    layer.bindPopup(popupContent);
}

function expandingBoxSearchCompleteCreate(line, layer) {
    var ExpandingBoxSearchID = line.properties.pk;

    var popupContent = '';

    layer.bindPopup(popupContent);
}

function trackLineSearchIncompleteCreate(line, layer) {
    var TrackLineSearchID = line.properties.pk;
    var TLSweepWidth = line.properties.sweep_width;

    var popupContent = 'Track Line Search<br />';

    popupContent += "Sweep Width = " + TLSweepWidth + "m<br />";

    layer.bindPopup(popupContent);
}

function trackLineSearchCompleteCreate(line, layer) {
    var TrackLineSearchID = line.properties.pk;

    var popupContent = '';

    layer.bindPopup(popupContent);
}

function creepingLineSearchIncompleteCreate(line, layer) {
    var TrackLineSearchID = line.properties.pk;
    var TLSweepWidth = line.properties.sweep_width;

    var popupContent = 'Track Line Search<br />';

    popupContent += "Sweep Width = " + TLSweepWidth + "m<br />";

    layer.bindPopup(popupContent);
}

function creepingLineSearchCompleteCreate(line, layer) {
    var TrackLineSearchID = line.properties.pk;

    var popupContent = '';

    layer.bindPopup(popupContent);
}

// eslint-disable-next-line no-unused-vars
function mapInit(map) {
    myMap = map;
    layerControl = L.control.layers({}, {});
    layerControl.addTo(map);

    map.locate({ setView: true, maxZoom: 16 });

    L.control.poiadder({}).addTo(map);
    L.control.polygonadder({}).addTo(map);
    L.control.lineadder({}).addTo(map);
    L.control.locate({
        setView: 'untilPan',
        keepCurrentZoomLevel: true,
        locateOptions: { enableHighAccuracy: true},
    }).addTo(map);
    L.control.smmadmin({}).addTo(map);

    var assetUpdateFreq = 3 * 1000;
    var assetTrackUpdateFreq = 30 * 1000;
    var userDataUpdateFreq = 10 * 1000;
    var searchIncompleteUpdateFreq = 30 * 1000;
    var searchCompleteUpdateFreq = 60 * 1000;

    var realtime = L.realtime({
            url: "/data/assets/positions/latest/",
            type: 'json',
        }, {
            interval: assetUpdateFreq,
            onEachFeature: assetCreate,
            updateFeature: assetUpdate,
            getFeatureId: function(feature) { return feature.properties.asset; }
        }).addTo(map);

    overlayAdd("Assets", realtime);

    realtime = L.realtime({
            url: "/data/pois/current/",
            type: 'json',
        }, {
            interval: userDataUpdateFreq,
            onEachFeature: poiCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        }).addTo(map);

    overlayAdd("POIs", realtime);

    realtime = L.realtime({
            url: "/data/userpolygons/current/",
            type: 'json',
        }, {
            interval: userDataUpdateFreq,
            onEachFeature: userPolygonCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        }).addTo(map);

    overlayAdd("Polygons", realtime);

    realtime = L.realtime({
            url: "/data/userlines/current/",
            type: 'json',
        }, {
            interval: userDataUpdateFreq,
            onEachFeature: userLineCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        }).addTo(map);

    overlayAdd("Lines", realtime);


    realtime = L.realtime({
            url: "/search/sector/incomplete/",
            type: 'json',
        }, {
            interval: searchIncompleteUpdateFreq,
            color: 'orange',
            onEachFeature: sectorSearchIncompleteCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        }).addTo(map);

    overlayAdd("Sector Searches (incomplete)", realtime);


    realtime = L.realtime({
            url: "/search/sector/completed/",
            type: 'json',
        }, {
            interval: searchCompleteUpdateFreq,
            onEachFeature: sectorSearchCompleteCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        });

    overlayAdd("Sector Searches (completed)", realtime);

    realtime = L.realtime({
            url: "/search/expandingbox/incomplete/",
            type: 'json',
        }, {
            interval: searchIncompleteUpdateFreq,
            color: 'orange',
            onEachFeature: expandingBoxSearchIncompleteCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        }).addTo(map);

    overlayAdd("ExpandingBox Searches (incomplete)", realtime);

    realtime = L.realtime({
            url: "/search/expandingbox/completed/",
            type: 'json',
        }, {
            interval: searchCompleteUpdateFreq,
            onEachFeature: expandingBoxSearchCompleteCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        });

    overlayAdd("Expanding Box Searches (completed)", realtime);


    realtime = L.realtime({
            url: "/search/trackline/incomplete/",
            type: 'json',
        }, {
            interval: searchIncompleteUpdateFreq,
            color: 'orange',
            onEachFeature: trackLineSearchIncompleteCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        }).addTo(map);

    overlayAdd("Track Line Searches (incomplete)", realtime);

    realtime = L.realtime({
            url: "/search/trackline/completed/",
            type: 'json',
        }, {
            interval: searchCompleteUpdateFreq,
            onEachFeature: trackLineSearchCompleteCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        });

    overlayAdd("Track Line Searches (completed)", realtime);

    realtime = L.realtime({
            url: "/search/creepingline/track/incomplete/",
            type: 'json',
        }, {
            interval: searchIncompleteUpdateFreq,
            color: 'orange',
            onEachFeature: creepingLineSearchIncompleteCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        }).addTo(map);

    overlayAdd("Creeping Line Searches (incomplete)", realtime);

    realtime = L.realtime({
            url: "/search/creepingline/track/completed/",
            type: 'json',
        }, {
            interval: searchCompleteUpdateFreq,
            onEachFeature: creepingLineSearchCompleteCreate,
            getFeatureId: function(feature) { return feature.properties.pk; }
        });

    overlayAdd("Creeping Line Searches (completed)", realtime);
}
