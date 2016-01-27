"use strict";
(function () {
    var app = angular.module("app.returns.activeReturn", [
        "ui.bootstrap.tpls"
        , "ui.bootstrap.modal"
        , "ui.bootstrap.popover"
        , "app.core.base"
        , "app.returns.core"
        , "cfp.hotkeys"
        , "app.helpers"
    ]);

    app.config(function ($stateProvider, RETURNS_COMPONENT_PATH) {
        $stateProvider
            .state("app.returns.return", {
                url: "/order/{order:[0-9]+}",
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/_return.html",
                resolve: {
                    // get this return object
                    data: function ($q, $stateParams, $log, returnsBL, ErrorFactory) {
                        $log.log("app.returns.return -> resolving return for order " + $stateParams.order);
                        return returnsBL.loadOrder($stateParams.order).then(
                            function (data) {
                                $log.log("app.returns.return -> resolved ", data);
                            },
                            function (rejectionWrapper) {
                                $log.log("app.returns.return -> rejected ", rejectionWrapper);
                                switch (rejectionWrapper.status) {
                                    case 404:
                                        return $q.reject(ErrorFactory.createStateChangeError({
                                            message: "Order " + $stateParams.order + " not found.",
                                            error: rejectionWrapper,
                                            reportToUser: true
                                        }));
                                    default:
                                        return $q.reject(ErrorFactory.createStateChangeError({
                                            message: rejectionWrapper.message,
                                            error: rejectionWrapper,
                                            reportToUser: true
                                        }));
                                }
                            }
                        );
                    },
                    // pre-load reason codes
                    reasonCodes: function ($q, returnsBL, ErrorFactory) {
                        return returnsBL.getReasonCodes().catch(function (error) {
                            $q.reject(ErrorFactory.createStateChangeError({ message: error.message, error: error, reportToUser: true }));
                        });
                    }
                },
                controllerAs: "returnStateCtrl",
                controller: "ReturnStateController"
            })
            .state("app.returns.return.edit", {
                abstract: true,
                url: "/edit",
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/_returnEdit.html",
                controller: "ReturnEditStateController"
            })
            .state("app.returns.return.edit.addItem", {
                url: "",
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/_returnItemSearch.html",
                controllerAs: "returnAddItemStateCtrl",
                controller: "ReturnAddItemStateController"
            })
            .state("app.returns.return.edit.addItemEntry", {
                url: "/addItem/{item:.+}",
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/_returnItemEntry.html",
                resolve: {
                    returnItem: function ($stateParams, $q, $log, data, returnsBL, ErrorFactory) {
                        var deferred = $q.defer();
                        $log.log("app.returns.return.edit.addItemEntry -> resolving returnItem " + $stateParams.item);
                        returnsBL.getItemFromOrder($stateParams.item).then(function (item) {
                            $log.log("app.returns.return.edit.addItemEntry -> resolved ", item);
                            deferred.resolve(item);
                        }, function (error) {
                            $log.log("app.returns.return.edit.addItemEntry -> rejected as not found");
                            deferred.reject(ErrorFactory.createStateChangeError({ message: "Item not found on order", error: error, reportToUser: true }));
                        });
                        return deferred.promise;
                    }
                },
                controllerAs: "returnAddItemEntryStateCtrl",
                controller: "ReturnAddItemEntryStateController"
            });
    });

    app.controller("ReturnStateController", function ($log, $state, data, returnsBL, GenericPopupService) {
        var ctrl = this;

        ctrl.data = returnsBL.getReturnData();

        ctrl.distilledOrderItemDetails = returnsBL.getDistilledOrderItems();
        ctrl.distilledReturningItems = returnsBL.getDistilledReturningItems();

        ctrl.getQuantityReturning = function (orderItemId) {
            return returnsBL.getQuantityReturning(orderItemId);
        }
        ctrl.getReasonCodeDisplay = function (code) {
            return returnsBL.getReasonCodeDisplay(code);
        }

        ctrl.cancelReturn = function () {
            var splashModal = GenericPopupService.showSplashMessage({
                title: "Cancelling Return"
            });
            returnsBL.cancelReturn().finally(function () {
                splashModal.opened.finally(function () {
                    splashModal.close();
                    ctrl.setSearchMode();
                });
            });
        };

        ctrl.setSearchMode = function () {
            $state.go("app.returns.search");
        };

        ctrl.printLabel = function (item) {
            var splashModal = null;
            var promise = null;
            if (item.isDamagedReason) {
                splashModal = GenericPopupService.showSplashMessage({
                    title: "Printing Damage Label"
                });
                promise = returnsBL.printDamagedLabel(item, 1);
            } else {
                splashModal = GenericPopupService.showSplashMessage({
                    title: "Printing Item Label"
                });
                promise = returnsBL.printItemLabel(item.itemNumber, item.virtualSku, 1);
            }
            promise.finally(function () {
                splashModal.opened.finally(function () {
                    splashModal.close();
                });
            });
        };

        ctrl.completeReturn = function () {
            var splashModal = GenericPopupService.showSplashMessage({
                title: "Completing Return"
            });
            var completeReturnPromise = returnsBL.completeReturn();
            completeReturnPromise.then(function () {
                GenericPopupService.showPopup({
                    message: "Return completed successfully",
                    title: "Success"
                }).result.then(function () {
                    $state.go("app.returns.search");
                }, function () {
                    $state.go("app.returns.search");
                });
            }, function (err) {
                //$log.log("error in complete return: ", err);
                GenericPopupService.showPopup({
                    message: err.message,
                    title: "Error",
                    mode: "ERROR"
                });
            });
            completeReturnPromise.finally(function () {
                splashModal.opened.finally(function () {
                    splashModal.close();
                });
            });
        };

        //no longer used after making LP's active instead of cached and delay-activated
        //ctrl.consignLp = function () {
        //    var splashModal = GenericPopupService.showSplashMessage({
        //        title: "Consigning LP to Cart"
        //    });
        //    ReturnPopupService.showConsignLPToCartPopup().result
        //        .then(function (consignToCartArgs) {
        //            returnsBL.consignLpToCart(consignToCartArgs.lp, consignToCartArgs.cart)
        //            .catch(function (error) {
        //                GenericPopupService.showPopup({
        //                    message: error.message,
        //                    title: "Error",
        //                    mode: "ERROR"
        //                });
        //            });
        //        }).finally(function () {
        //            splashModal.opened.finally(function () {
        //                splashModal.close();
        //            });
        //        });
        //};
    });

    app.controller("ReturnEditStateController", function ($state, $log, data, ReturnPopupService) {
        //ReturnPopupService.showOrdersForClient();
    });

    app.controller("ReturnAddItemStateController", function ($state, $scope, hotkeys, returnsBL) {
        var ctrl = this;
        ctrl.errorMessage = null;
        ctrl.itemSearch = null;

        hotkeys.bindTo($scope).add({
            combo: "esc",
            description: "Exit return back to order search",
            allowIn: ["INPUT", "SELECT", "TEXTAREA"],
            callback: function () {
                $state.go("app.returns.search");
            }
        });

        var setError = function (errorMessage) {
            ctrl.errorMessage = errorMessage;
        };

        var clearError = function () {
            ctrl.errorMessage = null;
        };

        ctrl.findSearchItem = function () {
            if (typeof ctrl.itemSearch !== "undefined" && ctrl.itemSearch !== null && ctrl.itemSearch !== "") {
                clearError();
                returnsBL.getItemFromOrder(ctrl.itemSearch).then(function (orderItem) {
                    $state.go("app.returns.return.edit.addItemEntry", { item: orderItem.virtualSku || orderItem.itemNumber });
                    ctrl.itemSearch = null;
                }, function () {
                    setError("Search for " + ctrl.itemSearch + " not found on this order");
                    ctrl.itemSearch = null;
                });

            }
        };
    });

    app.controller("ReturnAddItemEntryStateController", function ($state, $timeout, $scope, $modal, $log, hotkeys, RETURNS_COMPONENT_PATH, returnItem, returnsBL, ReturnPopupService, GenericPopupService, InventoryDataService) {
        var ctrl = this;
        ctrl.scannedOrderItem = returnItem;
        ctrl.processing = false;
        ctrl.errorMessage = null;
        ctrl.reasonCodes = [];
        ctrl.adjustedReasonCodes = [];

        ctrl.form = {};
        ctrl.tmp = {};

        hotkeys.bindTo($scope).add({
            combo: "esc",
            description: "Exit return back to item search",
            allowIn: ["INPUT", "SELECT", "TEXTAREA"],
            callback: function () {
                $state.go("app.returns.return.edit.addItem");
            }
        });
        returnsBL.getReasonCodes().then(function (codes) {
            ctrl.reasonCodes = codes.filter(function (code) { return code.isCustomerOption });
            ctrl.adjustedReasonCodes = codes;
        });

        var setError = function (errorMessage) {
            ctrl.errorMessage = errorMessage;
        };

        var clearError = function () {
            ctrl.errorMessage = null;
        };

        ctrl.getQuantityReturning = function (orderItemId) {
            return returnsBL.getQuantityReturning(orderItemId);
        }

        ctrl.addItemToReturn = function (supervisorCredentials) {
            ctrl.processing = true;
            //$log.log("adding item to return");
            clearError();
            try {
                var addArgs = {
                    itemNumber: ctrl.scannedOrderItem.itemNumber,
                    virtualSKU: ctrl.scannedOrderItem.virtualSku,
                    reasonCode: ctrl.form.selectedReasonCode,
                    adjustedReasonCode: ctrl.form.selectedAdjustedReasonCode,
                    container: ctrl.form.container,
                    quantity: 1
                };
                if (supervisorCredentials) {
                    addArgs.supervisorOverride = supervisorCredentials;
                }
                //$log.log("attempting to add item to return: ", addArgs);
                var addItemToReturnPromise = returnsBL.addItemToReturn(addArgs);
                addItemToReturnPromise.then(function () {
                    //$log.log("success in add item to return: ", data);
                    ctrl.setItemSearchMode();
                }, function(error) { ctrl.handleError(error, addArgs) });
                addItemToReturnPromise.finally(function () {
                    $timeout(function () {
                        ctrl.processing = false;
                    }, 100);
                });
            } catch (err) {
                setError(err);
                return;
            }
        };

        ctrl.handleError = function (error, addArgs) {
            if (error.interventionType === 1) {
                $log.log("Add Item To Return supervisor override required: ", error.message);
                ReturnPopupService.showAddItemToOrderSupervisorOverride(error).then(
                    function (credentials) {
                        ctrl.addItemToReturn(credentials);
                    }, function (cancelAction) {
                        if (cancelAction === "charity") {
                            ctrl.sendToCharity();
                        } else {
                            ctrl.setItemSearchMode();
                        }
                    }
                );
            } else if (error.interventionType === 0) {
                ReturnPopupService.showConsignLPToCartPopup(addArgs.container).result.then(function (args) {
                    InventoryDataService.consignLpToCart(args.lp, args.cart).then(function () {
                        ctrl.addItemToReturn(addArgs.supervisorOverride);
                    }).catch(function (error) {
                        GenericPopupService.showPopup({
                            message: error.message,
                            title: "Error",
                            mode: "ERROR"
                        });
                    });
                });
            } else if (error.interventionType === 2) {
                $log.log("Charity item: ", error.message);
                ctrl.sendToCharity();
            } else if (error.interventionType === 3) {
                $log.log("Charity supervisor override required: ", error.message);
                ReturnPopupService.showCharitySupervisorOverride(error).then(
                    function (credentials) {
                        ctrl.addItemToReturn(credentials);
                    }, function (cancelAction) {
                        ctrl.setItemSearchMode();
                    }
                );
            } else if (error.interventionType === 4) {
                $log.log("Caged item: ", error.message);
                ReturnPopupService.showCagedItemPopup(error).then(
                    function (credentials) {
                        ctrl.addItemToReturn(credentials);
                    }, function (cancelAction) {
                        ctrl.setItemSearchMode();
                    }
                );
            } else {
                //$log.log("error in add item to return: ", error.message);
                setError(error.message);
            }
        };

        ctrl.sendToCharity = function (errorMessage) {
            ReturnPopupService.showCharityGaylordPopup(ctrl.scannedOrderItem, ctrl.form.selectedReasonCode, ctrl.form.selectedAdjustedReasonCode, errorMessage).then(
                function (charityArgs) {
                    var splashModal = GenericPopupService.showSplashMessage({
                        title: "Saving"
                    });
                    returnsBL.sendToCharity(charityArgs).then(function () {
                        //$log.log("success in send To Charity");
                        ctrl.setItemSearchMode();
                    }, function (error) {
                        ctrl.sendToCharity(error.message);
                    }).finally(function () {
                        splashModal.opened.finally(function () {
                            splashModal.close();
                        });
                    });
                }, function () {
                    ctrl.setItemSearchMode();
                });

        };
        var validateReason = function (reasonCode) {
            try {
                var selectedCodeInt = parseInt(reasonCode);
                for (var i = 0; i < ctrl.adjustedReasonCodes.length; i++) {
                    if (selectedCodeInt == ctrl.adjustedReasonCodes[i].code) {
                        return ctrl.adjustedReasonCodes[i].code;
                    }
                }
            } catch (err) {
            }

            return false;
        };

        ctrl.setReasonCode = function (code) {
            //$log.log("setting SelectedReasonCode = " + code);
            var resolvedReasonCode = validateReason(code);
            if (resolvedReasonCode) {
                //$log.log("and selectedAjustedReasonCode = " + ctrl.tmp.selectedAdjustedReasonCode);
                if (angular.isUndefined(ctrl.form.selectedAdjustedReasonCode)
                    || ctrl.form.selectedAdjustedReasonCode === null
                    || ctrl.form.selectedAdjustedReasonCode === ctrl.form.selectedReasonCode)
                    ctrl.setAdjustedReasonCode(resolvedReasonCode, true);

                ctrl.tmp.selectedReasonCode = resolvedReasonCode;
                ctrl.form.selectedReasonCode = resolvedReasonCode;
            } else
                ctrl.tmp.selectedReasonCode = "";

            //$log.log("SelectedReasonCode = " + ctrl.form.selectedReasonCode);
        };

        ctrl.setAdjustedReasonCode = function (code, bypassValidate) {
            //$log.log("setting SelectedAdjustedReasonCode = " + code);
            var resolvedReasonCode = bypassValidate ? code : validateReason(code);
            if (resolvedReasonCode) {
                ctrl.tmp.selectedAdjustedReasonCode = resolvedReasonCode;
                ctrl.form.selectedAdjustedReasonCode = resolvedReasonCode;
            } else
                ctrl.tmp.selectedAdjustedReasonCode = "";

            //$log.log("SelectedAdjustedReasonCode = " + ctrl.form.selectedAdjustedReasonCode);
        }


        ctrl.setItemSearchMode = function () {
            $state.go("app.returns.return.edit.addItem");
        }
    });

    app.directive("addOrderNote", function ($log, ReturnPopupService, returnsBL) {
        return {
            restrict: "EA",
            link: function (scope, element) {;
                function _showAddOrderNotePopup(initialNote, message) {
                    ReturnPopupService.showAddOrderNotePopup(initialNote, message).then(function (note) {
                        returnsBL.addNoteToOrder(note).then(
                            function () { },
                            function (error) { _showAddOrderNotePopup(note, error.message) });
                    });
                }

                element.click(function () {
                    _showAddOrderNotePopup();
                });
            }
        };
    });

    app.directive("orderDetails", function ($log, RETURNS_COMPONENT_PATH, ReturnPopupService) {
        return {
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/orderDetails.html",
            link: function (scope) {
                scope.showOrdersForClient = function () {
                    ReturnPopupService.showOrdersForClient();
                }
            }
        }
    });

    app.directive("returnType", function ($log, RETURNS_COMPONENT_PATH) {
        return {
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/returnType.html",
            restrict: "EA",
            controller: "ReturnTypeDirectiveController",
            controllerAs: "returnTypeCtrl"
        }
    });

    app.controller("ReturnTypeDirectiveController", function ($log, $timeout, returnsBL, GenericPopupService) {
        var ctrl = this;
        ctrl.loading = false;
        ctrl.setReturnType = function (returnType) {
            ctrl.loading = true;
            returnsBL.getReturnData().returnData.details.type = returnType;
            var updateReturnDetailsPromise = returnsBL.updateReturnDetails();
            updateReturnDetailsPromise.catch(function (error) {
                GenericPopupService.showPopup({
                    message: error.message,
                    title: "Error Updating Return Details",
                    mode: "ERROR"
                });
            });
            updateReturnDetailsPromise.finally(function () {
                $timeout(function () {
                    ctrl.loading = false;
                }, 100);
            });
        };
    });

    app.directive("giftCustomerDetails", function ($log, $timeout, RETURNS_COMPONENT_PATH, returnsBL, GenericPopupService) {
        return {
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/giftCustomerDetails.html",
            restrict: "EA",
            link: function (scope, element, attrs) {
                var ctrl = scope.giftCustomerCtrl = {};
                ctrl.loading = 0;

                var data = returnsBL.getReturnData();
                ctrl.noCustomerDetails = data.returnData.details.noCustomerDetails || false;
                scope.$watch(
                    function () { return data.returnData.details.noCustomerDetails; },
                    function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            ctrl.noCustomerDetails = newValue;
                        }
                    }
                );
                var startLoading = function () {
                    ctrl.loading++;
                }
                var loadingComplete = function () {
                    $timeout(function () {
                        ctrl.loading--;
                        if (ctrl.loading < 0)
                            ctrl.loading = 0;
                        ctrl.giftCustomerDetailsForm.$setPristine();
                    }, 100);
                };

                ctrl.setNoCustomerDetails = function (noCustomerDetails) {
                    startLoading();
                    //$log.log("setNoCustomerDetails clicked "+ noCustomerDetails);
                    var setNoCustomerDetailsPromise = returnsBL.setNoCustomerDetails(noCustomerDetails);
                    setNoCustomerDetailsPromise.catch(function (error) {
                        GenericPopupService.showPopup({
                            message: error.message,
                            title: "Error Updating Return Details",
                            mode: "ERROR"
                        });
                    });
                    setNoCustomerDetailsPromise.finally(loadingComplete);
                }

                ctrl.updateReturnDetails = function () {
                    startLoading();
                    var updateReturnDetailsPromise = returnsBL.updateReturnDetails();
                    updateReturnDetailsPromise.catch(function (error) {
                        GenericPopupService.showPopup({
                            message: error.message,
                            title: "Error Updating Return Details",
                            mode: "ERROR"
                        });
                    });
                    updateReturnDetailsPromise.finally(loadingComplete);
                };
            }
        }
    });

    app.directive("mrlFee", function (RETURNS_COMPONENT_PATH) {
        return {
            restrict: "EA",
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/mrlFee.html",
            controller: "MrlFeeDirectiveController",
            controllerAs: "mrlCtrl"
        }
    });

    app.controller("MrlFeeDirectiveController", function ($log, $timeout, returnsBL, GenericPopupService) {
        var ctrl = this;
        ctrl.loading = false;
        ctrl.setCustomerPaysMrl = function (mrlValue) {
            var returnData = returnsBL.getReturnData().returnData;
            if (!returnData.mrlLocked) {
                ctrl.loading = true;
                returnData.details.customerPaysMRL = mrlValue;
                var updateReturnDetailsPromise = returnsBL.updateReturnDetails();
                updateReturnDetailsPromise.catch(function (error) {
                    GenericPopupService.showPopup({
                        message: error.message,
                        title: "Error Updating Return Details",
                        mode: "ERROR"
                    });
                });
                updateReturnDetailsPromise.finally(function () {
                    $timeout(function () {
                        ctrl.loading = false;
                    }, 100);
                });
            }
        };
    });

    app.directive("orderItems", function ($log, RETURNS_COMPONENT_PATH) {
        return {
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/orderItems.html"
        }
    });

    app.directive("returnActionPanel", function ($log, RETURNS_COMPONENT_PATH) {
        return {
            transclude: true,
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/returnActionPanel.html",
            link: function (scope, element, attrs) {
                scope.header = attrs.header;
            }
        }
    });

    app.directive("listReturningItems", function ($log, RETURNS_COMPONENT_PATH, returnsBL, GenericPopupService) {
        return {
            restrict: "EA",
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/listReturningItems.html",
            link: function (scope, element, attrs) {
                scope.removeItemFromReturn = function (item) {
                    if (item.charity) {
                        var removeCharityArgs = {
                            itemNumber: item.itemNumber,
                            virtualSKU: item.virtualSku,
                            reasonCode: item.reasonCode,
                            adjustedReasonCode: item.adjustedReasonCode,
                            container: item.container,
                            quantity: 1
                        };
                        returnsBL.removeItemFromCharity(removeCharityArgs).catch(function (error) {
                            GenericPopupService.showPopup({
                                message: error.message,
                                title: "Error Removing Item",
                                mode: "ERROR"
                            });
                        });
                    } else {
                        var removeReturnArgs = {
                            itemNumber: item.itemNumber,
                            virtualSKU: item.virtualSku,
                            reasonCode: item.reasonCode,
                            adjustedReasonCode: item.adjustedReasonCode,
                            container: item.container,
                            quantity: 1
                        };
                        returnsBL.removeItemFromReturn(removeReturnArgs).catch(function (error) {
                            GenericPopupService.showPopup({
                                message: error.message,
                                title: "Error Removing Item",
                                mode: "ERROR"
                            });
                        });
                    }
                };
            }
        }
    });

    app.directive("itemImages", function ($log, RETURNS_COMPONENT_PATH, returnsBL) {
        return {
            restrict: "EA",
            template: "<div><image-popover ng-repeat=\"img in imgs\" image-url=\"img.url\" icon-size=\"img.iconSize\" style=\"margin-right:5px\"></image-popover></div>",
            scope: {
                primaryImageUrl: "=",
                productId: "="
            },
            link: function (scope, element, attrs) {
                scope.imgs = [{
                    url: scope.primaryImageUrl,
                    iconSize: "lg"
                }];
                returnsBL.getAltImagesForProduct(scope.productId).then(function (altImages) {
                    altImages.forEach(function (altImg) {
                        scope.imgs.push({
                            url: altImg,
                            iconSize: "md"
                        });
                    });
                });
            }
        }
    });

    app.directive("imagePopover", function ($log, RETURNS_COMPONENT_PATH) {
        return {
            restrict: "EA",
            template: "<i class=\"fa fa-camera-retro\" ng-class=\"{'fa-lg':iconSize === 'lg'}\"></i>",
            scope: {
                imageUrl: "=",
                iconSize: "="
            },
            link: function (scope, element, attrs) {
                $(element).popover({
                    html: true,
                    trigger: "hover",
                    content: function () {
                        return "<img src=\"" + scope.imageUrl + "\"  style=\"width:100%\"/>";
                    }
                });
            }
        }
    });

    app.filter("reasonCodeDisplay", function ($log, returnsBL) {
        var reasonCodes = [];
        returnsBL.getReasonCodes().then(function (codes) {
            reasonCodes = codes;
        });

        return function (code, hideCode, noValueMessage, unrecognizedValueMessage) {
            for (var i = 0; i < reasonCodes.length; i++) {
                if (reasonCodes[i].code === code)
                    return hideCode ? reasonCodes[i].label : reasonCodes[i].code + " - " + reasonCodes[i].label;
            }

            if (code) {
                return unrecognizedValueMessage || null;
            }
            return noValueMessage || null;
        };
    });

    app.directive("otherCustomerOrder", function (RETURNS_COMPONENT_PATH) {
        return {
            restrict: "EA",
            scope: {
                order: "=",
                popupctrl: "="
            },
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/_otherCustomerOrder.html"
        }
    });

})();