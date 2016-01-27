///<reference path="~/assets/libs/angular/angular.js"/>
"use strict";
(function () {
    var componentPath = "./app/components/core";

    var app = angular.module("app.core.authentication", ["ui.router", "ngStorage", "app.core.configuration"]);

    app.config(function ($stateProvider, $httpProvider) {
        $httpProvider.interceptors.push(function ($q, $log, $rootScope, ApiAuthStoreService, $injector) {
            var HttpRequestQueue;
            return {
                'request': function (config) {
                    config.headers = config.headers || {};
                    if (ApiAuthStoreService.isAuthenticated()) {
                        config.headers.Authorization = "Bearer " + ApiAuthStoreService.getAccessToken();
                    }
                    return config;
                },
                'responseError': function (response) {
                    if (response.status === 401 || response.status === 403) {
                        $log.log("intercepted " + response.status);
                        HttpRequestQueue = HttpRequestQueue || $injector.get("HttpRequestQueue");
                        if (HttpRequestQueue && ApiAuthStoreService.isAuthenticated()) {
                            var deferred = $q.defer();
                            var queuePosition = HttpRequestQueue.enqueue(response, deferred);
                            $log.log("broadcasting HttpRequestFailedPendingAuthRefresh");
                            $rootScope.$broadcast("HttpRequestFailedPendingAuthRefresh", { statusCode: response.status, queueIndex: queuePosition });
                            return deferred.promise;
                        } else {
                            $log.log("broadcasting HttpRequestFailed");
                            $rootScope.$broadcast("HttpRequestFailed", { statusCode: response.status });
                        }

                    }
                    return $q.reject(response);
                }
            };
        });


        $stateProvider.state("signin", {
            url: "/",
            templateUrl: componentPath + "/signin.html",
            controller: "SigninController",
            controllerAs: "signinctrl",
            data: {
                settings: {
                    displayName: "Signin"
                }
            }
        });
    });

    app.run(function ($state, $rootScope, $log, ApiAuthStoreService, HttpRequestQueue, AuthenticationService) {
        $rootScope.$on("HttpRequestFailed", function () {
            $log.log("caught HttpRequestFailed, redirecting to signin");
            $state.go("signin");
        });

        $rootScope.$on("HttpRequestFailedPendingAuthRefresh", function (event, status) {
            $log.log("caught HttpRequestFailedPendingAuthRefresh: ", event, status);
            if (!ApiAuthStoreService.isAuthenticated()) {
                $log.log("but the user is no longer authenticated. redirecting to signin");
                HttpRequestQueue.rejectAll();
                $state.go("signin");
                return;
            }
            if (status.queueIndex === 1) {
                $log.log("the user is logged in and this is the first enqueued request, so lets refresh the auth");
                AuthenticationService.refreshAuth().then(function () {
                    HttpRequestQueue.retryAll();
                }, function () {
                    HttpRequestQueue.rejectAll();
                    $state.go("signin");
                });
            } else {
                $log.log("the user is logged in but this is not first enqueued request, so lets wait");
            }
        });
    });

    app.service("HttpRequestQueue", function ($http, $log) {
        var svc = this;

        var buffer = [];

        svc.enqueue = function (response, deferred) { 
            var position = buffer.push({ originalResponse: response, deferred: deferred });
            $log.log("enqueing at position " + position + ": ", response.config);
            return position;
        };

        svc.retryAll = function() {
            buffer.forEach(function(call) {
                $http(call.originalResponse.config).then(
                    function(response) { call.deferred.resolve(response); },
                    function(response) { call.deferred.reject(response); });
            });
            buffer = [];
        };

        svc.rejectAll = function() {
            buffer.forEach(function (call) {
                call.deferred.reject(call.originalResponse.data, call.originalResponse.status, call.originalResponse.headers, call.originalResponse.config);
            });
            buffer = [];
        };
    });

    app.service("ApiAuthStoreService", function ($q, $log, $rootScope, $sessionStorage) {
        var svc = this;
        svc.isAuthenticated = function () {
            return typeof $sessionStorage.auth !== "undefined" && $sessionStorage.auth !== null;
        }
        svc.saveAuth = function (auth) {
            $sessionStorage.auth = auth;
            $rootScope.$broadcast("ApiAuthStoreService_AuthSaved");
        }
        svc.getAccessToken = function () {
            var auth = $sessionStorage.auth;
            if (auth)
                return auth.access_token;
            return null;
        }
        svc.getRefreshToken = function() {
            var auth = $sessionStorage.auth;
            if (auth)
                return auth.refresh_token;
            return null;
        }
        svc.getPrinciple = function () {
            var auth = $sessionStorage.auth;
            if (auth) {
                var encodedPrinciple = auth.access_token.split(".")[1];
                var decodedPrinciple = atob(encodedPrinciple);
                return JSON.parse(decodedPrinciple);
            }
            return null;
        }
        svc.getUserId = function() {
            var principle = svc.getPrinciple();
            if (principle !== null) {
                return principle.nameId;
            }
            return null;
        }
        svc.forgetAuth = function () {
            delete $sessionStorage.auth;
            $rootScope.$broadcast("ApiAuthStoreService_AuthForgotten");
        }
    });

    app.service("AuthenticationService", function ($http, $q, $log, ApiAuthStoreService, WmsConfiguration, $browser) {
        var svc = this;
        svc.login = function (username, password) {
            var deferred = $q.defer();

            $log.log("authenticating...");
            WmsConfiguration.getConfig().then(function (config) {
                $http({
                    method: "POST",
                    url: config.environment.auth_server_url + "/token",
                    data: $.param({ grant_type: "password", username: username, password: password, client_id: '099153c2625149bc8ecb3e85e03f0022' }),
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                }).success(function (data) {
                    $log.log("authentication successful", data);
                    ApiAuthStoreService.saveAuth(data);
                    deferred.resolve();
                }).error(function (data) {
                    $log.log("authentication failed", data);

                    ApiAuthStoreService.forgetAuth();

                    if (typeof data.error !== "undefined" && data.error === "invalid_grant")
                        deferred.reject(data.error_description);
                    else
                        deferred.reject("An unknown error has occurred");
                });
            });
            return deferred.promise;
        };
        svc.logout = function () {
            ApiAuthStoreService.forgetAuth();
        };
        svc.refreshAuth = function () {
            var deferred = $q.defer();

            $log.log("refreshing authentication...");
            WmsConfiguration.getConfig().then(function (config) {
                $http({
                    method: "POST",
                    url: config.environment.auth_server_url + "/token",
                    data: $.param({ grant_type: "refresh_token", refresh_token: ApiAuthStoreService.getRefreshToken(), client_id: "099153c2625149bc8ecb3e85e03f0022" }),
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                }).success(function (data) {
                    $log.log("authentication refresh successful");
                    $log.info(data);
                    ApiAuthStoreService.saveAuth(data);
                    deferred.resolve();
                }).error(function (data) {
                    $log.log("authentication refresh failed");
                    $log.log(data);
                    ApiAuthStoreService.forgetAuth();
                    deferred.reject();
                });
            });
            return deferred.promise;
        }
    });

    app.controller("SigninController", function ($state, $log, AuthenticationService) {
        var ctrl = this;
        ctrl.username = null;
        ctrl.password = null;
        ctrl.error = null;
        ctrl.login = function () {
            AuthenticationService.login(ctrl.username, ctrl.password).then(
                function () {
                    $log.log("authentication service success");
                    $state.go("app.home");
                },
                function (data) {
                    ctrl.error = data;
                    $log.log("authentication service failure");
                });
        };
    });

    app.directive("currentUser", function () {
        return {
            restrict: "AE",
            controller: "CurrentUserDirectiveController",
            controllerAs: "currentUserCtrl",
            templateUrl: componentPath + "/currentUser.html"
        }
    });

    app.controller("CurrentUserDirectiveController", function ($scope, $log, AuthenticationService, ApiAuthStoreService) {
        var ctrl = this;

        ctrl.principle = null;

        ctrl.logout = function () {
            AuthenticationService.logout();
        }

        $scope.$on("ApiAuthStoreService_AuthSaved", function () {
            $log.log("CurrentUserDirectiveController received principle ", ApiAuthStoreService.getPrinciple());
            ctrl.principle = ApiAuthStoreService.getPrinciple();
        });
        $scope.$on("ApiAuthStoreService_AuthForgotten", function () {
            $log.log("CurrentUserDirectiveController principle cleared");
            ctrl.principle = null;
        });

        if (ApiAuthStoreService.isAuthenticated()) {
            $log.log("CurrentUserDirectiveController initializing with principle", ApiAuthStoreService.getPrinciple());
            ctrl.principle = ApiAuthStoreService.getPrinciple();
        }
    });
})();