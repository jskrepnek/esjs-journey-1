angular.module('eventStore', [])

.factory('guid', function() {
    return {
        new : function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }
    }
})

.factory('EventStore', function ($http, $q, $timeout, guid) {

    var url = 'http://127.0.0.1:2113/streams/';

    processPrevUri = function (prevUri, onEvent) {
        console.log('Processing previous uri: ' + prevUri);
        $http({
            method: 'GET',
            url: prevUri,
            headers: {
                'Content-Type': 'vnd.eventstore.atom+json'
            }
        }).success(function (data) {
            var entryPromises = [];
            data.entries.reverse().forEach(function (entry) {
                var entryUrl = null;
                entry.links.forEach(function (link) {
                    if (link.relation === "alternate") {
                        entryUrl = link.uri;
                    }
                });
                console.log('Processing entry at uri: ' + entryUrl);
                var entryPromise = $http({
                    method: 'GET',
                    url: entryUrl,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).success(function (data) {
                    onEvent(data);
                });
                entryPromises.push(entryPromise);
            });
            $q.all(entryPromises).then(function () {
                var previous = null;
                data.links.forEach(function (link) {
                    if (link.relation === "previous") {
                        previous = link.uri;
                    }
                });
                if (previous) {
                    processPrevUri(previous, onEvent);
                } else {
                    $timeout(function () {
                        processPrevUri(prevUri, onEvent);
                    }, 3000);
                }
            });
        });
    };

    var exports = {

        appendToStream : function (streamName, eventType, eventData) {
            $http({
                method: 'POST',
                url: url + streamName,
                data: [{
                    eventId: guid.new(),
                    eventType: eventType,
                    data: eventData
                }],
                headers: {
                    'Content-Type': 'application/vnd.eventstore.events+json'
                }
            })
        },

        subscribeToStream : function (streamName, onEvent) {
            processPrevUri(url + streamName, onEvent);
        }
    };

    return exports;
});

