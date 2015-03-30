angular.module('eventStore', [])

    .factory('guid', function () {
        return {
            new: function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
        }
    })

    .factory('EventStore', function ($http, $q, $timeout, guid) {

        var url = 'http://127.0.0.1:2113/streams/';

        processEntries = function (entries, onEntry) {
            var getEntryPromises = [];

            entries.reverse().forEach(function (entry) {
                var alternateLink = getLink(entry.links, "alternate");

                var entryPromise =
                    $http
                        .get(alternateLink.uri)
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
                        'Content-Type': 'vnd.eventstore.atom+json'
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
                        'Accept': 'application/vnd.eventstore.atom+json'
                    }
                })
                .success(function (data) {
                    lastLink = getLink(data.links, "last");
                    if (!lastLink) {
                        lastLink = getLink(data.links, "self");
                    }
                    defer.resolve(lastLink);
                });
            return defer.promise;
        }

        getLink = function(links, type) {
            var result = null;
            links.forEach(function (link) {
                if (link.relation === type) {
                    result = link;
                }
            });
            return result;
        }

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
                        'Content-Type': 'application/vnd.eventstore.events+json'
                    }
                })
            },

            subscribeToStream: function (streamName, onEvent) {
                getLast(streamName)
                    .then(function (lastLink) {
                        processPrevUri(lastLink.uri, onEvent);
                    });
            }
        };

        return exports;
    });

