angular.module('app.messageBoard', ['eventStore'])

    .controller('MessageBoardCtrl', ['EventStore', function (EventStore) {
        var controller = this;

        controller.messages = [];
        controller.postContent = "";

        EventStore.subscribeToStream('messageStream', function (event) {
            controller.messages.unshift(event);
        });

        controller.post = function () {
            EventStore.appendToStream('messageStream', 'MessagePosted',
                {
                    content: controller.postContent,
                    dateTime: Date(),
                    name: controller.name
                }
            );
            controller.postContent = "";
        }
    }]);

'use strict';
