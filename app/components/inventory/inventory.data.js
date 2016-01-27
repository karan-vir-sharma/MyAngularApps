"use strict";
(function () {
    var app = angular.module("app.inventory.data", ["app.core.configuration"]);

    app.service("InventoryDataService", function ($http, $q, $log, WmsConfiguration) {
        var svc = this;

        svc.consignLpToCart = function (lp, cart) {
            $log.log("consigning lp " + lp + " to cart " + cart);
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                var postData = {};
                $http.post(config.environment.ApiEndpoints.Inventory + "/lps/v1/" + lp + "/consignToCart/" + cart, postData).then(
                    function(response) {
                        deferred.resolve(response.data);
                    },
                    function(rejectionWrapper) {
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };
    });

})();