"use strict";
(function () {
    var app = angular.module("app.core.printing", ["ui.bootstrap.tpls", "ui.bootstrap.modal", "ngStorage", "app.core.base", "app.core.configuration", "app.helpers"]);

    app.constant("PRINTING_COMPONENT_PATH", "./app/components/core");
    app.service("PrintingService", function ($q, $http, $log, $modal, $localStorage, PRINTING_COMPONENT_PATH, WmsConfiguration, GenericPopupService) {
        var svc = this;

        svc.printerConfig = {
            labelPrinter: $localStorage.configuredLabelPrinter || null
        };

        svc.getLabelPrinters = function () {
            var deferred = $q.defer();

            WmsConfiguration.getConfig().then(function (config) {
                if (!config.environment.ApiEndpoints.Printing) {
                    deferred.reject({ message: "The printing endpoint is not configured, cannot get a list of label printers." });
                } else {
                    $http.get(config.environment.ApiEndpoints.Printing + "/v1/getLabelPrinters")
                        .success(function (printers) {
                            for (var i = 0; i < printers.length; i++) {
                                printers[i].selected = printers[i].nickName === svc.printerConfig.labelPrinter;
                            }
                            //printers[10].selected = true;
                            deferred.resolve(printers);
                        }).error(function (err) {
                            deferred.reject(err);
                        });
                }
            });
            return deferred.promise;
        };

        svc.printBasicLabel = function (text, printer, quantity) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                var postBody = { textToPrint: text, destinationPrinter: printer, quantityRequested: quantity };
                $http.post(config.environment.ApiEndpoints.Printing + "/v1/createBasicPrintJob", postBody)
                    .then(function () {
                        $log.log("label submitted for printing successfully: ", postBody);
                        deferred.resolve();
                    }, function (rejection) { deferred.reject(rejection); });
            });
            return deferred.promise;
        }

        svc.printItemLabel = function (itemNumber, printer, quantity) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                var postBody = { itemNumber: itemNumber, destinationPrinter: printer, quantityRequested: quantity };
                $http.post(config.environment.ApiEndpoints.Printing + "/v1/createItemPrintJob", postBody)
                    .then(function () {
                        $log.log("label submitted for printing successfully: ", postBody);
                        deferred.resolve();
                    }, function (rejection) { deferred.reject(rejection); });
            });
            return deferred.promise;
        };

        svc.setLabelPrinter = function (labelPrinter) {
            $localStorage.configuredLabelPrinter = labelPrinter;
            svc.printerConfig.labelPrinter = labelPrinter;
        };

        svc.showLabelPrinterConfigPopup = function () {
            return svc.getLabelPrinters().then(function (labelPrinters) {
                return $modal.open({
                    templateUrl: PRINTING_COMPONENT_PATH + "/templates/labelPrinterConfigPopup.html",
                    size: "sm",
                    controller: function ($scope, $modalInstance) {
                        var popupCtrl = $scope.popupCtrl = this;

                        popupCtrl.labelPrinters = [];

                        popupCtrl.labelPrinters = labelPrinters;
                        popupCtrl.currentPrinter = svc.printerConfig.labelPrinter;

                        popupCtrl.setPrinter = function (printer) {
                            $log.log("printer selected: ", printer);
                            $modalInstance.close(printer);
                        }
                        popupCtrl.cancel = function () {
                            $modalInstance.dismiss("cancel");
                        };
                    }
                }).result.then(function (selectedLabelPrinter) {
                    svc.setLabelPrinter(selectedLabelPrinter);
                });
            }, function (err) {
                return GenericPopupService.showPopup({
                    message: err.message,
                    title: "Error",
                    mode: "ERROR"
                }).result;
            });
        };
    });

    app.directive("currentLabelPrinter", function (PrintingService) {
        return {
            restrict: "EA",
            template: "<a href ng-click=\"setPrinter()\"><span>{{printerConfig.labelPrinter.nickName || \"Select Label Printer\"}}</span></a>",
            link: function (scope, element) {
                scope.printerConfig = PrintingService.printerConfig;
                scope.setPrinter = function () {
                    PrintingService.showLabelPrinterConfigPopup();
                };

            }
        }
    });
})();