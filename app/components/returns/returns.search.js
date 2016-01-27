"use strict";
(function () {
    var app = angular.module("app.returns.search", [
        "ui.bootstrap.tpls"
        , "ui.bootstrap.modal"
        , "app.core.base"
        , "app.returns.core"
        , "app.helpers"
        , "app.inventory.data"]);


    app.config(function ($stateProvider, RETURNS_COMPONENT_PATH) {
        $stateProvider
            .state("app.returns.search", {
                url: "/search",
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/_search.html",
                controllerAs: "searchStateCtrl",
                controller: "SearchStateController",
                data: {
                    display: {
                        sectionId: "returns",
                        sectionText: "Returns",
                        linkText: "Returns 2"
                    }
                }
            });
    });

    app.service("ReturnsSearchPopupService", function ($log, $sce, $modal, $location, $timeout, returnsBL, RETURNS_COMPONENT_PATH) {
        var svc = this;

        svc.showNotOurItemPopup = function () {
            return $modal.open({
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/notOurItemPopup.html",
                //size: "sm",
                controller: function ($scope, $modalInstance) {
                    var popupCtrl = $scope.popupCtrl = this;
                    popupCtrl.form = {};
                    popupCtrl.download = function () {
                        returnsBL.getNotOurItemDocumentLink(popupCtrl.form).then(function (documentUrl) {
                            $log.log(documentUrl);

                            $scope.$on("downloadInitialized", function () {
                                $timeout(function () {
                                    $modalInstance.close();
                                });
                            });
                            $scope.$broadcast("downloadFile", documentUrl);
                            return false;
                        });
                    };
                    popupCtrl.cancel = function () {
                        $modalInstance.dismiss("cancel");
                    };
                }
            }).result;
        }
    });

    app.directive("fileDownload", function () {
        var fd = {
            restrict: 'A',
            link: function (scope, element) {

                scope.$on("downloadFile", function (e, url) {
                    var iframe = element.find("#download-iframe");
                    if (!(iframe && iframe.length > 0)) {
                        iframe = $("<iframe id='download-iframe' style='position:fixed;display:none;top:-1px;left:-1px;'/>");
                        element.append(iframe);
                    }
                    iframe.attr("src", url);
                    scope.$emit("downloadInitialized");
                });
            }
        };

        return fd;
    });

    app.controller("SearchStateController", function ($state, $log, returnsBL, InventoryDataService, ReturnsSearchPopupService, ReturnPopupService, GenericPopupService) {
        var ctrl = this;

        ctrl.searchText = "";
        ctrl.showResult = false;
        ctrl.message = "";
        ctrl.results = [];
        function clearSearch() {
            ctrl.showResults = false;
            ctrl.message = "";
            ctrl.results = [];
        }
        function setResults(message, results) {
            ctrl.showResults = true;
            ctrl.message = message;
            ctrl.results = results || [];
        }



        ctrl.executeSearch = function (search) {
            clearSearch();
            ctrl.searchText = search;
            //$log.log("executing search: " + search);

            // here we want to inject returnsDataAccess and query execute the
            // intelligent order search api.
            var searchPromise = returnsBL.search(search);
            searchPromise.then(
                function (results) {
                    $log.log("search results: ", results);
                    // if it returns no records, 
                    //      notify the user somehow and return them to the search to try again
                    if (results.length === 0) {
                        setResults("No orders were found. Check your search and try again.");
                    }

                        // if it returns more than one record, 
                        //      forward to the search resolution page (something like app.returns.search.resolve)
                    else if (results.length > 1) {
                        setResults("Multiple results found. Please select the correct result below or try your search again.", results);
                    }

                        // if it returns exactly one record, 
                        //      automatically forward to app.returns.return.edit.addItem with the
                        //      order id. similar to what we're shortcircuiting here.
                    else {
                        $state.go("app.returns.return.edit.addItem", { order: results[0].orderId });
                    }
                },
                function (err) {
                    //$log.log("search failed with error ", error);
                    GenericPopupService.showPopup({
                        message: err.message,
                        title: "Error",
                        mode: "ERROR"
                    });
                });

            // oh, and show a splash message!
            var splashModal = GenericPopupService.showSplashMessage({
                title: "Searching",
                detail: "Searching for " + search + "..."
            });
            searchPromise.finally(function () {
                splashModal.opened.finally(function () {
                    splashModal.close();
                });
            });

        };

        ctrl.showNotOurItemPopup = function () {
            ReturnsSearchPopupService.showNotOurItemPopup();
        }

        ctrl.showConsignLPToCart = function () {
            var splash = GenericPopupService.showSplashMessage({
                title: "Consigning LP to Cart"
            });
            ReturnPopupService.showConsignLPToCartPopup().result.then(function (args) {
                InventoryDataService.consignLpToCart(args.lp, args.cart).catch(function (error) {
                    GenericPopupService.showPopup({
                        message: error.message,
                        title: "Error",
                        mode: "ERROR"
                    });
                });
            }).finally(function () {
                splash.opened.finally(function () {
                    splash.close();
                });
            });
        }
    });

})();