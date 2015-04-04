angular.module('eventStore', ['guid', 'base64'])

    .factory('EventStore', function ($http, $q, $timeout, guid, Base64) {

        var url = 'http://127.0.0.1:2113/streams/',
            token = Base64.encode('messager:messager');

        processEntries = function (entries, onEntry) {
            var getEntryPromises = [];

            entries.reverse().forEach(function (entry) {
                var alternateLink = getLink(entry.links, "alternate");

                var entryPromise =
                    $http
                        .get(alternateLink.uri, {
                            headers: {
                                'Authorization': 'Basic ' + token
                            }
                        })
                        .success(function (data) {
                            onEntry(data);
                        });

                getEntryPromises.push(entryPromise);
            });
            return $q.all(getEntryPromises);
        };

        processPrevUri = function (prevUri, onEvent) {
            $http
                .get(prevUri, {
                    headers: {
                        'Content-Type': 'vnd.eventstore.atom+json',
                        'Authorization': 'Basic ' + token
                    }
                })
                .success(function (data) {
                    processEntries(data.entries, onEvent)
                        .then(function () {
                            var previousLink = getLink(data.links, "previous");

                            if (previousLink) {
                                processPrevUri(previousLink.uri, onEvent);
                            } else {
                                $timeout(function () {
                                    processPrevUri(prevUri, onEvent);
                                }, 50);
                            }
                        });
                });
        };

        getLast = function (streamName) {
            var defer = $q.defer();
            $http
                .get(url + streamName, {
                    headers: {
                        'Authorization': 'Basic ' + token,
                        'Accept': 'application/vnd.eventstore.atom+json'
                    }
                })
                .success(function (data) {
                    var lastLink = getLink(data.links, "last");
                    if (!lastLink) {
                        lastLink = getLink(data.links, "self");
                    }
                    defer.resolve(lastLink);
                });
            return defer.promise;
        };

        getPrevious = function (streamName) {
            var defer = $q.defer();
            $http
                .get(url + streamName, {
                    headers: {
                        'Authorization': 'Basic ' + token,
                        'Accept': 'application/vnd.eventstore.atom+json'
                    }
                })
                .success(function (data) {
                    var previousLink = getLink(data.links, "previous");
                    defer.resolve(previousLink);
                });
            return defer.promise;
        };

        getLink = function (links, type) {
            var result = null;
            links.forEach(function (link) {
                if (link.relation === type) {
                    result = link;
                }
            });
            return result;
        };

        var exports = {

            appendToStream: function (streamName, eventType, eventData) {
                var streamUrl = url + streamName;
                var data = [{
                    eventId: guid.new(),
                    eventType: eventType,
                    data: eventData
                }];

                $http.post(streamUrl, data, {
                    headers: {
                        'Authorization': 'Basic ' + token,
                        'Content-Type': 'application/vnd.eventstore.events+json'
                    }
                })
            },

            subscribeToStream: function (streamName, onEvent) {
                getPrevious(streamName)
                    .then(function (previousLink) {
                        processPrevUri(previousLink.uri, onEvent);
                    });
            }
        };

        return exports;
    });


