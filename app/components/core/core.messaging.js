"use strict";
(function () {
    var componentPath = "./app/components/core";
    var app = angular.module("app.core.messaging", ["ui.bootstrap.tpls", "ui.bootstrap.modal", "app.core.base", "app.core.authentication", "app.core.configuration", "app.helpers"]);

    app.run(function ($rootScope, $log, MessagingService, ApiAuthStoreService) {
        $rootScope.$on("ApiAuthStoreService_AuthSaved", function () {
            MessagingService.startPolling();
        });
        $rootScope.$on("ApiAuthStoreService_AuthForgotten", function () {
            MessagingService.stopPolling();
        });
        $rootScope.$on("MesssagingService_PollingComplete", function () {
            $log.log("MesssagingService_PollingComplete");
            $log.log("" + MessagingService.messages().length + " messages awaiting acknowledgement");
        });

        if (ApiAuthStoreService.isAuthenticated())
            MessagingService.startPolling();
    });

    app.service("MessagingDataService", function ($q, $log, $http, WmsConfiguration) {
        var svc = this;

        svc.getMessages = function () {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.Messaging + "/messages/getUnread")
                    .success(function (data) {
                        $log.log("getUnreadMessages success");
                        $log.log(data);
                        deferred.resolve(data);
                    }).error(function (err) {
                        $log.log("getUnreadMessages failure");
                        $log.log(err);
                        deferred.reject();
                    });
            });
            return deferred.promise;
        }

        svc.acknowledge = function (messageId) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Messaging + "/messages/" + messageId + "/acknowledge")
                    .success(function () {
                        $log.log("message " + messageId + " acknowledged successfully");
                        deferred.resolve();
                    }).error(function (err) {
                        $log.log("message " + messageId + " acknowledge failed");
                        $log.log(err);
                        deferred.reject();
                    });
            });
            return deferred.promise;
        }
    });
    app.factory("MessagingService", function ($q, $log, $modal, $timeout, MessagingDataService) {
        var _running = false;

        var _poll = function () {
            if (_running) {
                MessagingDataService.getMessages().then(function (messages) {
                    $log.log("message polling success");

                    if (messages.length > 0) {
                        _processMessages(messages).then(function () {
                            _poll();
                        });
                    } else {
                        _sleepAndPoll();
                    }
                }, function () {
                    $log.log("message polling failure");
                });
            }
        };

        var _sleepAndPoll = function () {
            if (_running) {
                $timeout(function () {
                    if (_running) {
                        _poll();
                    }
                }, 30000);
            }
        };

        var _processMessages = function (messages) {
            var deferred = $q.defer();

            var processRemaining = function () {
                if (messages.length > 0) {
                    var message = messages.shift();
                    $log.log(message);
                    _showMessagePopup(message).result.then(function () {
                        return MessagingDataService.acknowledge(message.id);
                    }).then(function () {
                        $timeout(function () {
                            processRemaining();
                        });
                    });
                } else {
                    deferred.resolve();
                }
            }
            processRemaining();
            return deferred.promise;
        }

        var _showMessagePopup = function (message) {
            return $modal.open({
                templateUrl: componentPath + "/messagePopup.html",
                controller: function ($scope, $modalInstance) {
                    var ctrl = $scope.popupCtrl = this;
                    ctrl.message = message;

                    ctrl.close = function () {
                        $modalInstance.close();
                    };
                }
            });
        }


        return {
            startPolling: function () {
                if (!_running) {
                    $log.log("starting message polling");
                    _running = true;
                    _poll();
                }
            },
            stopPolling: function () {
                $log.log("stopping message polling");
                _running = false;
            }
        }
    });
})();