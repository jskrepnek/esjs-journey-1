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
                var entryUri = null;

                entry.links.forEach(function (link) {
                    if (link.relation === "alternate") {
                        entryUri = link.uri;
                    }
                });

                var entryPromise =
                    $http
                        .get(entryUri)
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
                            var previousLinkUri = null;

                            data.links.forEach(function (link) {
                                if (link.relation === "previous") {
                                    previousLinkUri = link.uri;
                                }
                            });

                            if (previousLinkUri) {
                                processPrevUri(previousLinkUri, onEvent);
                            } else {
                                $timeout(function () {
                                    processPrevUri(prevUri, onEvent);
                                }, 3000);
                            }
                        });
                });
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
                        'Content-Type': 'application/vnd.eventstore.events+json'
                    }
                })
            },

            subscribeToStream: function (streamName, onEvent) {
                processPrevUri(url + streamName, onEvent);
            }
        };

        return exports;
    });

