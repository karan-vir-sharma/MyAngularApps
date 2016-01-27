/// <reference path="templates/Transfers.html" />
// JavaScript source code
"use strict";

(function () {
    var app = angular.module('app.transfers.core', [
        "ui.router",
        "ui.bootstrap.tpls", "ui.bootstrap.modal", "ui.bootstrap.popover", "app.core.base",
        "ui.bootstrap",
        "app.core.configuration"
    ]);

    var transfersApiEndPoint1 = '';
    app.constant("SHARED_COMPONENT_PATH", "./app/shared");
    app.constant("TRANSFER_COMPONENT_PATH", "./app/components/Transfers");
    app.config(function ($stateProvider, TRANSFER_COMPONENT_PATH) {

        $stateProvider.state("transferDetails", {
            url: "/transfers",
            controller: "MainCtrl",
            controllerAs: "MainCtrl",
            templateUrl: TRANSFER_COMPONENT_PATH + "/templates/Transfers.html"
        })
            .state("stateTruckDetails", {
                parent: "transferDetails",
                params: { transferSessionId: 0 },
                onEnter: [
                    "$modal", function ($modal) {
                        $modal.open({
                            controller: "TruckDetailsController",
                            controllerAs: "truckDetails",
                            templateUrl: TRANSFER_COMPONENT_PATH + '/templates/truckDetails.html',
                            size: 'lg'
                        }).result.finally(function () {
                            $stateProvider.go('^');
                        });
                    }
                ]
            });
    });
    app.factory('transferService', function ($http, WmsConfiguration,$q) {        
        var api = {};
        api.getInTransitTransferDetails = function () {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.Transfers + "/v1/GetInTransitInventory")
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("transferApi.getInTransitTransferDetails", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.getTruckDetails = function (id) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.Transfers + "/v1/GetInTransitTruckDetails/" + id)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("transferApi.getTruckDetails", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };
        return api;
    });
    app.controller('MainCtrl', function (transferService, $scope, $q, $timeout, GenericPopupService) {

        var ctrl = this;

        $scope.filterOptions = {
            unloadDate: [
              { id: 2, name: 'Trucks - Not Yet Unloaded', value: null },
              { id: 3, name: 'Unloaded Trucks', value: '' },
              { id: 4, name: 'All Trucks', value: 1 }

            ]
        };
        $scope.selected = $scope.filterOptions.unloadDate[0];
        function setResults(message, results) {
            ctrl.showResults = true;
            ctrl.message = message;
            ctrl.results = results || [];
        }
        // Call the async method and then do stuff with what is returned inside our own then function
        var searchPromise = transferService.getInTransitTransferDetails().then(function (d) {
            console.log(d.inTransitTrucks);
            console.log('Count');
            console.log(d.inTransitTrucks.length);
            if (d.inTransitTrucks.length === 0) {
                setResults("No In-Transit Inventory found. Please try again!");
            }

            $scope.data = d;
            angular.forEach($scope.data, function (value, index) {
                console.log(index);
            });

            console.log($scope.selected.name);
            console.log($scope.selected.value);
        });

        var splashModal = GenericPopupService.showSplashMessage({
            title: "Searching",
            detail: "Searching for In-Transit Inventory..."
        });
        searchPromise.finally(function () {
            splashModal.opened.finally(function () {
                splashModal.close();
            });
        });

    });
    app.filter("truckDateFilter", function () {
        return function (dataobj, multipleVlaue) {
            if (!multipleVlaue || multipleVlaue.value === 1) return dataobj;
            if (dataobj) {
                return dataobj.filter(function (truck) {
                    return ((truck.unloadDate === null) === (multipleVlaue.value === null));
                });
            }
        };
    });
    app.filter("truckItemFilter", function () {
        return function (dataobj, searchValue) {
            if (!searchValue) return dataobj;
            if (dataobj) {
                return dataobj.filter(function (truck) {
                    return truck.pallets.filter(function (pallets) {
                        return pallets.licensePlates.filter(function (licensePlates) {
                            return licensePlates.items.filter(function (item) {
                                return (item.itemNumber.toString().indexOf(searchValue) >= 0) || (item.virtualSKU.toString().indexOf(searchValue) >= 0);
                            }).length > 0;
                        }).length > 0;
                    }).length > 0;
                });
            }
        };
    });
    app.controller('TruckDetailsController', function (transferService, $scope, $stateParams, $q, $timeout, GenericPopupService) {
        // Call the async method and then do stuff with what is returned inside our own then function
        var ctrl = this;
        var truckDetailsPromise = transferService.getTruckDetails($stateParams.transferSessionId).then(function (d) {
            $scope.data = d;
            angular.forEach($scope.data, function (value, index) {
                console.log(value);
                console.log('Test Value Truck');
            });


            //*************Error Handling Yet to Be Implemented****************//
            //listOfTrucks = $scope.data["inTransitTrucks"];
            //var listOfPallets = listOfTrucks.pallets;
            //console.log('Logging Truck object');
            //console.log(listOfTrucks.length);
            //console.log('Logging Pallet object');
            //console.log(listOfPallets);

        });
        var splashModal = GenericPopupService.showSplashMessage({
            title: "Searching",
            detail: "Searching for Truck Details..."
        });
        truckDetailsPromise.finally(function () {
            splashModal.opened.finally(function () {
                splashModal.close();
            });
        });
        ctrl.ok = function () {
            $scope.$close(true);
        };
    });
    app.directive('jqdatepicker', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModelCtrl) {
                $(function () {
                    element.datepicker({
                        dateFormat: 'yy-mm-dd',
                        onSelect: function (date) {
                            scope.$apply(function () {
                                ngModelCtrl.$setViewValue(date);
                            });
                        }
                    });
                });
            }
        }
    });

})();



