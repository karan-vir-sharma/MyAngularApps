"use strict";
(function () {
    var app = angular.module("app.core.base", []);

    app.config(function ($httpProvider) {
        if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};
        }

        // Ensure IE does not cache results of repeated GET requests
        $httpProvider.defaults.headers.get["If-Modified-Since"] = "Sat, 01 Jan 2000 00:00:00 GMT";

        $httpProvider.interceptors.push(function ($q, $log) {
            function logRejectionToConsole(context, rejection) {
                $log.log("- BEGIN $http " + context + " ---------------------------------");
                $log.log("request: " + rejection.config.method + " " + rejection.config.url);
                if (rejection.config.body) {
                    $log.log("request body: " + rejection.config.body);
                }
                $log.log("response status: " + rejection.status + " " + rejection.statusText);
                $log.log("ui message: " + (rejection.message || "None"));
                $log.log("rejection: ", rejection);
                $log.log("- END $http " + context + " -----------------------------------");
            }

            return {
                'request': function (config) {
                    // Ensure chrome sends cross-origin cookies
                    if (!config.hasOwnProperty["withCredentials"]) config.withCredentials = true;
                    return config;
                }
                , 'requestError': function (rejection) {
                    logRejectionToConsole("requestError", rejection);
                    return $q.reject(rejection);
                }
                //, 'response': function (response) {
                //    $log.log("HTTP response: ", response);
                //    return response;
                //}
                , 'responseError': function (rejection) {
                    switch (rejection.status) {
                        case 400: // bad request
                        case 500: // server error
                        case 409: // supervisor override
                            rejection.message = rejection.data.message;
                            break;
                        default:
                            rejection.message = "An unknown error has occured.";
                            break;
                    }
                    logRejectionToConsole("responseError", rejection);
                    return $q.reject(rejection);
                }
            };
        });
    });

    app.run(function ($log, $rootScope, $state, $window, $location, $timeout, GenericPopupService) {
        $rootScope.$on("$stateChangeError", function (event, toState, toParams, fromState, fromParams, error) {
            $log.log("- BEGIN $stateChangeError -----------------------------------");
            $log.log("event: ", event);
            $log.log("toState: ", toState);
            $log.log("toParams: ", toParams);
            $log.log("fromState: ", fromState);
            $log.log("fromParams: ", fromParams);
            $log.log("error: ", error);
            $log.log("- END $stateChangeError -------------------------------------");
            if (!error.hasOwnProperty("reportToUser") || error.reportToUser) {
                $timeout(function () {
                    GenericPopupService.showPopup({
                        message: error.message,
                        title: "Error",
                        mode: "ERROR",
                        reloadState: true
                    });
                });
            }
            //if (fromState.url === "^")
            //    $log.log($location);
        });
    });

    app.service("ErrorFactory", function ($log) {
        var svc = this;

        svc.createStateChangeError = function (errorArgs) {
            var error = {
                message: errorArgs.message,
                detail: errorArgs.detail,
                error: errorArgs.error || null,
                reportToUser: errorArgs.hasOwnProperty("reportToUser") ? errorArgs.reportToUser : true
            };

            return error;
        };
    });

    app.service("GenericPopupService", function ($modal, $log, $timeout, SHARED_COMPONENT_PATH) {
        var svc = this;

        svc.showPopup = function (messageArgs) {
            return $modal.open({
                templateUrl: SHARED_COMPONENT_PATH + "/templates/genericPopup.html",
                controller: function ($scope, $modalInstance, $state, hotkeys) {
                    var popupCtrl = $scope.popupCtrl = this;

                    popupCtrl.messageArgs = messageArgs;

                    popupCtrl.ok = function () {
                        $modalInstance.close("ok");
                        if (messageArgs.reloadState === true)
                            $state.reload();
                    };

                    hotkeys.bindTo($scope).add({
                        combo: "enter",
                        description: "close dialog",
                        callback: function () {
                            popupCtrl.ok();
                        }
                    });
                }
            });

        };

        svc.showSplashMessage = function (messageArgs) {
            return $modal.open({
                templateUrl: SHARED_COMPONENT_PATH + "/templates/splashPopup.html",
                backdrop: "static",
                size: "sm",
                keyboard: "false",
                controller: function ($scope) {
                    var popupCtrl = $scope.popupCtrl = this;
                    popupCtrl.messageArgs = messageArgs;
                }
            });
        };
    });
})();