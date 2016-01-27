"use strict";

(function () {
    var app = angular.module('app.users.data', ['app.core.configuration']);

    app.factory('UsersDataService', function ($q, $http, $log, WmsConfiguration) {
        var api = {};
        var configCache = WmsConfiguration.getConfig();

        api.getUsersByPageName = function (pageName) {
            var task = $q.defer();

            $q.when(configCache).then(function (config) {
                $http.get(config.environment.ApiEndpoints.WmsUsers + "/v1/withPageName/" + pageName)
                    .then(function (results) {
                        task.resolve(results.data);
                    }, function (error) {
                        $log.log("getUsersByPageName(" + pageName + ") failed", error);
                        task.reject(error);
                    });
            });

            return task.promise;
        }

        return api;
    });
})();