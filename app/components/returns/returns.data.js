"use strict";
(function () {
    var module = angular.module("app.returns.data", ["app.core.configuration"]);

    module.factory("returnsDataAccess", function ($http, $q, $log, WmsConfiguration) {
        var api = {};

        function handleError(context, rejection) {
            //$log.log(context + " received " + rejection.status + " response: ", rejection);
        }

        api.search = function (search) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.Orders + "/intelligentOrderSearch/v1/" + search + "/global")
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.search", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.getReasonCodes = function () {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.Returns + "/v1/reasonCodes")
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.getReasonCodes", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.loadOrder = function (orderId) {
            var deferred = $q.defer();

            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn")
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.loadOrder", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });

            return deferred.promise;
        };

        api.getAltImagesForProduct = function (productId) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.Images + "/v1/altImages/" + productId + "/ExtraLarge")
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.getAltImagesForProduct", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.updateReturnDetails = function (orderId, returnDetails) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/updateDetails", returnDetails)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.updateReturnDetails", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.getItemNumberByAlu = function (alu) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.ALUs + "/v1/" + alu + "/getItemNumber")
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.getItemNumberByAlu", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.addItemToReturn = function (orderId, item) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/addItem", item)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.addItemToReturn", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.removeItemFromReturn = function (orderId, item) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/removeItem", item)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.removeItemFromReturn", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };


        api.removeItemFromCharity = function (orderId, item) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/removeCharityItem", item)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.removeItemFromCharity", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.consignLpToCart = function (orderId, lp, cart) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/lps/" + lp + "/putOnCart/" + cart)
                    .then(function () {
                        deferred.resolve();
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.consignLpToCart", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        }

        api.sendToCharity = function (orderId, charityArgs) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/addCharityItem", charityArgs)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.sendToCharity", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.addNoteToOrder = function (orderId, note) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/orderNotes", JSON.stringify(note))
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.addNoteToOrder", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.completeReturn = function (orderId) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/complete")
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.completeReturn", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.getNotOurItemDocumentLink = function (params) {
            return WmsConfiguration.getConfig().then(function (config) {
                var queryString = $.param(params);
                return config.environment.ApiEndpoints.Returns + "/v1/documents/notouritem?" + queryString;
            });
        };

        api.cancelReturn = function (orderId) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/cancel")
                    .then(function () {
                        deferred.resolve();
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.cancelReturn", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.killReturn = function (orderId) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/" + orderId + "/activeReturn/kill")
                    .then(function () {
                        deferred.resolve();
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.killReturn", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.getRecentOrdersForClient = function (clientId) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.Orders + "/getRecentOrdersByCustomer/" + clientId)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("returnsDataAccess.getRecentOrdersForClient", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };
        return api;
    });

})();