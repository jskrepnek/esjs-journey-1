'use strict';

angular.module('myApp.view1', ['eventStore'])

.controller('View1Ctrl', ['EventStore', function(EventStore) {
        var controller = this;

        controller.messages = [];
        controller.postContent = "";

        EventStore.subscribeToStream('messageStream', function (event) {
            controller.messages.unshift(event);
        });

        controller.post = function () {
            EventStore.appendToStream('messageStream', 'MessagePosted', { content: controller.postContent, dateTime: Date() });
            controller.postContent = "";
        }
    }]);