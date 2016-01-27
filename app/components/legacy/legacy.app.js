///<reference path="~/assets/libs/angular/angular.js"/>
"use strict";
(function () {
    var app = angular.module("app", [
          "ui.router"
        , "app.core.base"
        , "app.core.configuration"
        , "app.returns"
        , "app.helpers"
        , "app.transfers.core"
        , "app.CutLP.core"
    ]);

    var componentPath = "./app/components/core";
    app.config(function ($stateProvider, $urlRouterProvider, $httpProvider) {
       $urlRouterProvider.otherwise("/app/returns/search");

        $stateProvider
            .state("app", {
                url: "/app",
                abstract: true,
                template: "<div ui-view></div>",
                resolve: {
                    config: function ($q, WmsConfiguration, ErrorFactory) {
                        return WmsConfiguration.getConfig().catch(function (error) {
                            $q.reject(ErrorFactory.createStateChangeError({ message: error.message, error: error, reportToUser: true }));
                        });
                    }
                },
                data: {}
            });


        $httpProvider.interceptors.push(function ($q, $log, $window) {
            return {
                "responseError": function (rejection) {
                    switch (rejection.status) {
                        case 401:
                        case 403:
                            $log.log("Forbidden");
                            $window.location.href = "/";
                            break;
                        default:
                            break;
                    }
                    return $q.reject(rejection);
                }
            };
        });
    });

    app.factory("responseObserver", function ($q, $log, $window) {
        return function (promise) {
            return promise.then(function (successResponse) {
                $log.log("responseObserver - success");
                return successResponse;
            }, function (errorResponse) {
                $log.log("responseObserver - error");

                switch (errorResponse.status) {
                    case 401:
                    case 403:
                        $log.log("responseObserver - error forbidden");
                        $window.parent.location.href = "/";
                        break;
                    default:
                        break;
                }

                return $q.reject(errorResponse);
            });
        };
    });
})();

(function () {
    var app = angular.module("app.core.authentication", ["app.core.configuration"]);

    app.service("ApiAuthStoreService", function ($http, WmsConfiguration) {
        var svc = this;

        var userId = null;

        WmsConfiguration.getConfig().then(function (config) {
            $http.get(config.environment.ApiEndpoints.LegacyApi + "/v1/getCurrentUserId")
                .success(function (data) {
                    userId = data;
                }).error(function (error) {
                    userId = 0;
                });
        });

        svc.getUserId = function () {
            return userId;
        }
    });

})();
