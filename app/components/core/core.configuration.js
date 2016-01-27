"use strict";
(function () {
    var componentPath = "./app/components/core";
    var app = angular.module("app.core.configuration", ["app.core.base", "app.helpers"]);
    
    app.factory("WmsConfiguration", function ($http, $log, $q, auth_server_url, GenericPopupService) {
        var _config = { };
        var _loadConfigPromise = null;

        var _loadEnvironmentConfiguration = function () {
            var deferred = $q.defer();
            $http.get(auth_server_url + "/environment/configuration").then(function (response) {
                _config.environment = response.data;
                _config.environment.auth_server_url = auth_server_url;

                $log.log("Environment configuration loaded: ", _config);
                deferred.resolve(_config);
            },function (error) {
                GenericPopupService.showPopup({
                    message: error.message,
                    title: "Error",
                    mode: "ERROR"
                });
                deferred.reject(error);
            });
            return deferred.promise;
        };

        return {
            getConfig: function () {
                if (_loadConfigPromise === null) {
                    _loadConfigPromise = _loadEnvironmentConfiguration();
                }

                return _loadConfigPromise;
            }
        };

    });

    app.directive("environmentNotice", function () {
        return {
            restrict: "EA",
            controller: "EnvironmentNoticeController",
            controllerAs: "envNoticeCtrl",
            templateUrl: componentPath + "/environmentNotice.html"
        }
    });

    app.controller("EnvironmentNoticeController", function ($log, WmsConfiguration) {
        var ctrl = this;
        ctrl.testing = "testing";
        //$log.log("environment notice controller taking action!");

        ctrl.notice = null;
        ctrl.isError = false;
        ctrl.loading = true;
        ctrl.environmentType = null;
        WmsConfiguration.getConfig().then(function (config) {
            //$log.log("environment notice controller loaded config");
            //$log.log(config);
            ctrl.environmentType = config.environment.EnvironmentType;
            ctrl.notice = config.environment.EnvironmentType + " - " + config.environment.EnvironmentName;
            ctrl.loading = false;
        }, function (err) {
            //$log.log("environment notice controller had an error");
            ctrl.isError = true;
            ctrl.notice = err;
            ctrl.loading = false;
        });
    });
})();