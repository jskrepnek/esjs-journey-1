'use strict';

angular.module('myApp.view1', ['eventStore'])

.controller('View1Ctrl', ['EventStore', function(EventStore) {
        var controller = this;
        controller.messages = [];

        EventStore.subscribeToStream('messageStream', function (event) {
            controller.messages.unshift(event);
        });

        controller.post = function (content) {
            EventStore.appendToStream('messageStream', 'MessagePosted', { content: content, dateTime: Date() });
        }
    }]);