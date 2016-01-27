"use strict";
(function () {
    var app = angular.module("app.returns", ["app.core.authentication", "app.returns.core", "app.returns.search", "app.returns.activeReturn", "app.returns.dashboard"]);
})();

(function () {
    var app = angular.module("app.returns.core", [
        "ui.router"
        , "ui.bootstrap.tpls"
        , "ui.bootstrap.modal"
        , "ui.bootstrap.collapse"
        , "app.returns.data"
        , "app.core.printing"
        , "app.helpers"
    ]);

    app.constant("RETURNS_COMPONENT_PATH", "./app/components/returns");

    app.config(function ($stateProvider, RETURNS_COMPONENT_PATH) {
        $stateProvider
            .state("app.returns", {
                abstract: true,
                url: "/returns",
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/returnsComponentRoot.html"
            });
    });

    app.factory("returnsBL", function ($q, $log, returnsDataAccess, ApiAuthStoreService, PrintingService) {
        var api = {};
        var data = {};
        var distilledOrderItemDetails = [];
        var distilledReturningItems = [];
        var reasonCodes = null;
        var reasonCodeLookup = {};
        var altImagesLookup = {};

        function getDistilledOrderedItem(orderedItemId) {
            for (var i = 0; i < distilledOrderItemDetails.length; i++) {
                if (distilledOrderItemDetails[i].orderItemId === orderedItemId)
                    return distilledOrderItemDetails[i];
            }
            return false;
        }

        function distillReturnData() {
            distillOrderItems();
            distillReturningItems();
            distillReturnState();
        }

        function distillReturnState() {
            data.returnData.stateLookup = {};
            data.returnData.state.forEach(function (state) {
                data.returnData.stateLookup[state] = state;
            });

            data.returnData.canEnterItems = !data.returnData.stateLookup.hasOwnProperty("NoReturnType")
                && !data.returnData.stateLookup.hasOwnProperty("NoMRLSelected")
                && !data.returnData.stateLookup.hasOwnProperty("NoGiftCustomerDetails");
        }

        function distillOrderItems() {
            distilledOrderItemDetails.splice(0, distilledOrderItemDetails.length);
            var _virtualSkuByItemNumberLookup = {};
            data.orderData.packages.forEach(function (pkg) {
                pkg.items.forEach(function (pkgItem) {
                    if (!_virtualSkuByItemNumberLookup.hasOwnProperty(pkgItem.itemNumber))
                        _virtualSkuByItemNumberLookup[pkgItem.itemNumber] = pkgItem.virtualSKU || "";
                });
            });
            data.orderData.orderItems.forEach(function (orderItem) {
                //$log.log("distilling ", orderItem);
                var distilledInfo = {
                    orderItemId: orderItem.id,
                    productId: orderItem.productId,
                    itemNumber: orderItem.itemNumber,
                    virtualSku: _virtualSkuByItemNumberLookup[orderItem.itemNumber] || "",
                    description: orderItem.description,
                    size: orderItem.size,
                    quantityShipped: orderItem.quantityShipped + orderItem.quantityReshipped - orderItem.quantityReturned,
                    quantityReturned: orderItem.quantityReturned,
                    weShip: orderItem.weShip,
                    imageUrl: orderItem.imageURL
                };
                //$log.log(orderItem.id + " distilled to ", distilledInfo);
                distilledOrderItemDetails.push(distilledInfo);
            });
        }

        function distillReturningItems() {
            api.getReasonCodes().finally(function () { // distilling returning items depends on reason codes being loaded
                distilledReturningItems.splice(0, distilledReturningItems.length);

                var orderedItemLookup = {};
                data.orderData.orderItems.forEach(function (orderedItem) {
                    orderedItemLookup[orderedItem.id] = orderedItem;
                });

                data.returnData.returningItems.forEach(function (returningItem) {
                    var orderItem = orderedItemLookup[returningItem.orderedItemId];
                    var distilledInfo = {
                        orderedItemId: returningItem.orderedItemId,
                        productId: orderItem.productId,
                        itemNumber: returningItem.itemNumber,
                        virtualSku: returningItem.virtualSKU,
                        description: orderItem.description,
                        size: orderItem.size,
                        reasonCode: returningItem.reasonCode,
                        isDamagedReason: reasonCodeLookup[returningItem.reasonCode].isDamaged,
                        isAdjustedDamagedReason: reasonCodeLookup[returningItem.adjustedReasonCode].isDamaged,
                        adjustedReasonCode: returningItem.adjustedReasonCode,
                        quantity: returningItem.quantity,
                        container: returningItem.container,
                        imageUrl: orderItem.imageURL,
                        charity: false
                    }
                    distilledReturningItems.push(distilledInfo);
                });

                data.returnData.charityItems.forEach(function (charityItem) {
                    var orderItem = orderedItemLookup[charityItem.orderedItemId];
                    var distilledInfo = {
                        orderedItemId: charityItem.orderedItemId,
                        productId: orderItem.productId,
                        itemNumber: charityItem.itemNumber,
                        virtualSku: charityItem.virtualSKU,
                        description: orderItem.description,
                        reasonCode: charityItem.reasonCode,
                        isDamagedReason: reasonCodeLookup[charityItem.reasonCode].isDamaged,
                        isAdjustedDamagedReason: reasonCodeLookup[charityItem.adjustedReasonCode].isDamaged,
                        adjustedReasonCode: charityItem.adjustedReasonCode,
                        quantity: charityItem.quantity,
                        container: charityItem.container,
                        imageUrl: orderItem.imageURL,
                        charity: true
                    }
                    distilledReturningItems.push(distilledInfo);
                });
            });
        }

        api.getFilteredOrders = function (searchText, orderList) {
            if (searchText === "")
                return orderList;

            var orderStack = [];
            orderStack = $.map(orderList, function (order) {
                if (order.itemDetails.some(function (item) {
                    return item.itemNum.toString().toLowerCase().indexOf(searchText) === 0 || item.virtualSKU.toLowerCase().indexOf(searchText) === 0 || item.itemALU.toLowerCase().indexOf(searchText) === 0;
                })) {
                    return order;
                } else
                    return null;
            });

            return orderStack;
        };

        function distillReasonCodes() {
            for (var i = 0; i < reasonCodes.length; i++) {
                reasonCodeLookup[reasonCodes[i].code] = reasonCodes[i];
            }
        }

        api.getReturnData = function () {
            return data;
        };

        api.getAltImagesForProduct = function (productId) {
            var deferred = $q.defer();
            var productIdStr = productId.toString();
            if (altImagesLookup.hasOwnProperty(productIdStr))
                deferred.resolve(altImagesLookup[productIdStr]);
            else {
                returnsDataAccess.getAltImagesForProduct(productId).then(function (altImageUrls) {
                    altImagesLookup[productIdStr] = altImageUrls;
                    deferred.resolve(altImageUrls);
                }, function () {
                    deferred.reject();
                });
            }
            return deferred.promise;
        };

        api.getQuantityReturning = function (orderedItemId) {
            var totalReturning = 0;
            data.returnData.returningItems.forEach(function (returningItem) {
                if (returningItem.orderedItemId === orderedItemId) {
                    totalReturning += returningItem.quantity;
                }
            });
            return totalReturning;
        };

        api.getAnyItemsInReturn = function () {
            if (data.returnData.returningItems.length > 0 || data.returnData.charityItems.length > 0)
                return true;
            return false;
        };

        api.getDistilledOrderItems = function () {
            return distilledOrderItemDetails;
        };

        api.getDistilledReturningItems = function () {
            return distilledReturningItems;
        };

        api.loadOrder = function (orderId) {
            var loadOrderPromise = returnsDataAccess.loadOrder(orderId);
            loadOrderPromise.then(function (d) {
                data = d;
                distillReturnData();
            }, function (error) { $log.log("Load Order Failed: ", error) });
            return loadOrderPromise;
        };

        api.search = function (search) {
            return returnsDataAccess.search(search);
        };

        api.getItemFromOrder = function (itemSearch) {
            var deferred = $q.defer();

            function findOnOrder(search) {
                for (var i = 0; i < data.orderData.packages.length; i++) {
                    var pkg = data.orderData.packages[i];
                    for (var j = 0; j < pkg.items.length; j++) {
                        if (pkg.items[j].virtualSKU === search) {
                            return getDistilledOrderedItem(pkg.items[j].orderItemID);
                        }
                    }
                }
                for (var i = 0; i < data.orderData.packages.length; i++) {
                    var pkg = data.orderData.packages[i];
                    for (var j = 0; j < pkg.items.length; j++) {
                        if (pkg.items[j].itemNumber == search &&
                        (pkg.items[j].virtualSKU || "") === "") {
                            return getDistilledOrderedItem(pkg.items[j].orderItemID);
                        }
                    }
                }
                return false;
            }

            var item = findOnOrder(itemSearch);
            if (item) {
                deferred.resolve(item);
            } else {
                returnsDataAccess.getItemNumberByAlu(itemSearch).then(function (data) {
                    item = findOnOrder(data);
                    if (item)
                        deferred.resolve(item);
                    else
                        deferred.reject("Item was not found on this order");
                }, function () {
                    deferred.reject("Item was not found on this order");
                });

            }
            return deferred.promise;
        };

        api.getReasonCodes = function () {
            var deferred = $q.defer();

            if (reasonCodes !== null) {
                deferred.resolve(reasonCodes);
            } else {
                returnsDataAccess.getReasonCodes().then(function (data) {
                    reasonCodes = data;
                    distillReasonCodes();
                    deferred.resolve(reasonCodes);
                }, function (err) {
                    $log.log("error loading reason codes: ", err);
                    deferred.reject(err);
                });
            }
            return deferred.promise;
        };

        api.removeItemFromReturn = function (item) {
            var deferred = $q.defer();
            //$log.log("removing item from return: ", item);
            returnsDataAccess.removeItemFromReturn(data.orderData.id, item).then(function (returnData) {
                //update data structures from return value
                data.returnData = returnData;
                distillReturnData();
                //$log.log("post remove data: ", returnData);
                deferred.resolve(returnData);
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise;
        };

        api.removeItemFromCharity = function (item) {
            var deferred = $q.defer();
            //$log.log("removing item from return: ", item);
            returnsDataAccess.removeItemFromCharity(data.orderData.id, item).then(function (returnData) {
                //update data structures from return value
                data.returnData = returnData;
                distillReturnData();
                //$log.log("post remove data: ", returnData);
                deferred.resolve(returnData);
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise;
        };


        api.addItemToReturn = function (item) {
            var deferred = $q.defer();
            //$log.log("adding item to return: ", item);
            returnsDataAccess.addItemToReturn(data.orderData.id, item).then(function (returnData) {
                // update data structures from return value
                data.returnData = returnData;
                distillReturnData();
                deferred.resolve(returnData);
            }, function (error) {
                switch (error.status) {
                    case 409:
                        //public enum UserInterventionType
                        //{
                        //    LPNotConsigned,
                        //    SupervisorOverrideRequired
                        //}
                        deferred.reject({ message: error.data.message, policyResults: error.data.policyResults, interventionType: error.data.interventionType });
                        break;
                    default:
                        deferred.reject(error);
                }
            });
            return deferred.promise;
        };

        api.sendToCharity = function (charityArgs) {
            var deferred = $q.defer();
            //$log.log("sending item to charity: ", charityArgs);
            returnsDataAccess.sendToCharity(data.orderData.id, charityArgs).then(function (returnData) {
                // update data structures from return value
                data.returnData = returnData;
                distillReturnData();
                deferred.resolve(returnData);
            }, function (error) {
                deferred.reject(error);
            });
            return deferred.promise;
        };

        api.setNoCustomerDetails = function (noCustomerDetails) {
            //$log.log("Setting noCustomerDetails to " + noCustomerDetails);
            data.returnData.details.noCustomerDetails = noCustomerDetails;
            if (noCustomerDetails) {
                data.returnData.details.giftCustomerDetails = {};
            }
            //$log.log("giftCustomerDetails is now: ", data.returnData.details.giftCustomerDetails);
            return api.updateReturnDetails();
        };

        api.updateReturnDetails = function () {
            var deferred = $q.defer();

            //deferred.resolve(data.returnData);
            //$log.log("updating return details on server: ", data.returnData.details);
            returnsDataAccess.updateReturnDetails(data.orderData.id, data.returnData.details).then(function (returnData) {
                data.returnData = returnData;
                distillReturnData();
                deferred.resolve(returnData);
                //$log.log("return details updated on server successfully: ", data.returnData.details);
                //$log.log("------------------");
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise;
        };

        api.consignLpToCart = function (lp, cart) {
            //$log.log("consigning lp to cart: ", { orderId: data.orderData.id, lp: lp, cart: cart });
            return returnsDataAccess.consignLpToCart(data.orderData.id, lp, cart);
        };

        api.printItemLabel = function (itemNumber, virtualSku, quantity) {
            //$log.log("printing item label for: ", { itemNumber: itemNumber, virtualSku: virtualSku, quantity: quantity });

            function _print(printer) {
                if (angular.isString(virtualSku) && virtualSku !== "") {
                    return PrintingService.printBasicLabel(virtualSku, printer.description, quantity);
                } else {
                    return PrintingService.printItemLabel(itemNumber, printer.description, quantity);
                }
            }

            var printer = PrintingService.printerConfig.labelPrinter;
            if (printer)
                return _print(printer);
            else {
                return PrintingService.showLabelPrinterConfigPopup().then(function () {
                    printer = PrintingService.printerConfig.labelPrinter;
                    return _print(printer);
                }, function () {
                    $q.reject({ message: "No label printer has been configured" });
                });
            };

        };

        api.printDamagedLabel = function (item, quantity) {
            //$log.log("printing item label for: ", { itemNumber: itemNumber, virtualSku: virtualSku, quantity: quantity });

            function _print(printer) {
                var text = (angular.isString(item.virtualSku) && item.virtualSku !== ""
                    ? item.virtualSku
                    : item.itemNumber) + "-" + ((item.isAdjustedDamagedReason) ? item.adjustedReasonCode : item.reasonCode) + "-" + ApiAuthStoreService.getUserId();

                //// need to create a printed damage label lookup instead of inspecting returningItem
                //// since the returning item objects are regenerated with each request to the api
                //// also need to track how many per "key" have been printed so far and 
                //// only print what is needed
                //item.damageLabelPrinted = true;
                if (printer) {
                    return PrintingService.printBasicLabel(text, printer.description, quantity)
                    //.catch(function () {
                    //    item.damageLabelPrinted = false;
                    //})
                    ;
                }
                return $q.reject({ message: "No label printer has been configured" });
            }

            var printer = PrintingService.printerConfig.labelPrinter;
            if (printer)
                return _print(printer);
            else {
                return PrintingService.showLabelPrinterConfigPopup().then(function () {
                    printer = PrintingService.printerConfig.labelPrinter;
                    return _print(printer);
                }, function () {
                    $q.reject({ message: "No label printer has been configured" });
                });
            };

        };

        api.addNoteToOrder = function (note) {
            var deferred = $q.defer();
            //$log.log("adding order note: ", note);
            returnsDataAccess.addNoteToOrder(data.orderData.id, note).then(function (returnData) {
                //$log.log("note added to order with response: ", returnData);
                data.returnData = returnData;
                distillReturnData();
                deferred.resolve(returnData);
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise;
        };

        api.getNotOurItemDocumentLink = function (params) {
            return returnsDataAccess.getNotOurItemDocumentLink(params);
        };

        api.completeReturn = function () {
            var printPromises = [];
            distilledReturningItems.forEach(function (returningItem) {
                if (returningItem.isDamagedReason || returningItem.isAdjustedDamagedReason) {
                    if (printPromises.length === 0) {
                        printPromises.push(api.printDamagedLabel(returningItem, returningItem.quantity));
                    } else {
                        printPromises[printPromises.length - 1].then(function () {
                            printPromises.push(api.printDamagedLabel(returningItem, returningItem.quantity));
                        });
                    }
                }
            });
            if (printPromises.length > 0)
                return printPromises[printPromises.length - 1].then(returnsDataAccess.completeReturn(data.orderData.id));
            else
                return returnsDataAccess.completeReturn(data.orderData.id);
        };

        api.cancelReturn = function () {
            return returnsDataAccess.cancelReturn(data.orderData.id);
        };

        api.getRecentOrdersForClient = function () {
            return returnsDataAccess.getRecentOrdersForClient(data.orderData.clientID).then(function (allRecentOrders) {
                var otherRecentOrders = [];
                if (allRecentOrders) {
                    allRecentOrders.forEach(function (order) {
                        if (order.orderId !== data.orderData.id)
                            otherRecentOrders.push(order);
                    });
                }
                $log.log(otherRecentOrders);
                return otherRecentOrders;
            });
        };

        return api;
    });

    app.directive("mailingAddress", function (RETURNS_COMPONENT_PATH) {
        return {
            restrict: "EA",
            scope: {
                address: "="
            },
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/mailingAddress.html"
        }
    });

    app.service("ReturnPopupService", function ($log, $modal, $timeout, RETURNS_COMPONENT_PATH, returnsBL, GenericPopupService) {
        var svc = this;

        svc.showCharityGaylordPopup = function (returningOrderItem, reasonCode, adjustedReasonCode, errorMessage) {
            return $modal.open({
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/charityGaylordPopup.html",
                size: "lg",
                controller: function ($scope, $modalInstance) {
                    var popupCtrl = $scope.popupCtrl = this;

                    popupCtrl.returningOrderItem = returningOrderItem;
                    popupCtrl.reasonCode = reasonCode;
                    popupCtrl.adjustedReasonCode = adjustedReasonCode;
                    popupCtrl.charityContainer = "";

                    popupCtrl.errorMessage = errorMessage || null;

                    popupCtrl.submit = function () {
                        var charityArgs = {
                            orderedItemId: popupCtrl.returningOrderItem.orderedItemId,
                            itemNumber: popupCtrl.returningOrderItem.itemNumber,
                            virtualSKU: popupCtrl.returningOrderItem.virtualSku,
                            quantity: 1,
                            reasonCode: popupCtrl.reasonCode,
                            adjustedReasonCode: popupCtrl.adjustedReasonCode,
                            container: popupCtrl.charityContainer
                        };
                        $modalInstance.close(charityArgs);
                    };
                    popupCtrl.cancel = function () {
                        $modalInstance.dismiss("cancel");
                    };
                }
            }).result;
        };

        svc.showAddItemToOrderSupervisorOverride = function (messageArgs) {
            return $modal.open({
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/addItemToOrderSupervisorOverride.html",
                controller: function ($scope, $modalInstance) {
                    var popupCtrl = $scope.popupCtrl = this;
                    popupCtrl.username = "";
                    popupCtrl.password = "";

                    popupCtrl.messageArgs = messageArgs;

                    popupCtrl.charityGaylord = function () {
                        //$log.log("charity gaylord selected");
                        $modalInstance.dismiss("charity");
                    };
                    popupCtrl.supervisorOverride = function () {
                        //$log.log("supervisorOverride selected");
                        $modalInstance.close({
                            userName: popupCtrl.username, password: popupCtrl.password, type: "Return Window Override"
                        });
                    };
                    popupCtrl.cancel = function () {
                        //$log.log("cancel selected");
                        $modalInstance.dismiss("cancel");
                    };
                }
            }).result;
        };

        svc.showCharitySupervisorOverride = function (messageArgs) {
            return $modal.open({
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/addItemToOrderSupervisorOverride.html",
                controller: function ($scope, $modalInstance) {
                    var popupCtrl = $scope.popupCtrl = this;
                    popupCtrl.username = "";
                    popupCtrl.password = "";
                    popupCtrl.HideCharity= true;

                    popupCtrl.messageArgs = messageArgs;

                    popupCtrl.charityGaylord = function () {
                        //$log.log("charity gaylord selected");
                        $modalInstance.dismiss("charity");
                    };
                    popupCtrl.supervisorOverride = function () {
                        //$log.log("supervisorOverride selected");
                        $modalInstance.close({ userName: popupCtrl.username, password: popupCtrl.password, type: "Charity Window Override" });
                    };
                    popupCtrl.cancel = function () {
                        //$log.log("cancel selected");
                        $modalInstance.dismiss("cancel");
                    };
                }
            }).result;
        };

        svc.showCagedItemPopup = function (messageArgs) {
            return $modal.open({
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/cagedItemPopup.html",
                controller: function ($scope, $modalInstance) {
                    var popupCtrl = $scope.popupCtrl = this;

                    popupCtrl.submit = function () {
                        $modalInstance.close({ userName: null, password: null, type: "Caged Item Acknowledgement" });
                    };
                    popupCtrl.cancel = function () {
                        $modalInstance.dismiss("cancel");
                    };
                }
            }).result;
        };

        svc.showAddOrderNotePopup = function (note, errorMessage) {
            return $modal.open({
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/addOrderNotePopup.html",
                controller: function ($scope, $modalInstance) {
                    var popupCtrl = $scope.popupCtrl = this;
                    popupCtrl.note = note || "";
                    popupCtrl.errorMessage = errorMessage || null;

                    popupCtrl.submit = function () {
                        //$log.log("add order note submitted: ", popupCtrl.note);
                        $modalInstance.close(popupCtrl.note);
                    };
                    popupCtrl.cancel = function () {
                        //$log.log("cancel selected");
                        $modalInstance.dismiss("cancel");
                    };
                }
            }).result;
        };

        svc.showOrdersForClient = function () {
            if (returnsBL.getAnyItemsInReturn()) {
                return GenericPopupService.showPopup({
                    message: "Please unload LP's before proceeding",
                    title: "Warning",
                    mode: "ERROR"
                });
            } else {
                var splashModal = GenericPopupService.showSplashMessage({
                    title: "Loading other customer orders..."
                });
                return returnsBL.getRecentOrdersForClient().then(function (orders) {
                    return $modal.open({
                        templateUrl: RETURNS_COMPONENT_PATH + "/templates/showOrdersForClientPopup.html",
                        size: "lg",
                        controller: function ($scope, $modalInstance, $state, $log) {

                            var popupCtrl = $scope.popupCtrl = this;
                            popupCtrl.orders = orders;
                            popupCtrl.searchText = "";

                            $scope.$watch(
                                function (scope) { return scope.popupCtrl.searchText; },
                                function (newValue, oldValue) {
                                    if (newValue === "" || newValue !== oldValue)
                                        popupCtrl.filteredOrders = returnsBL.getFilteredOrders(popupCtrl.searchText, orders);
                                }
                            );

                            popupCtrl.propSelector = function (item) {
                                var props = [];
                                if (item.virtualSKU) props.push(item.virtualSKU);
                                if (item.itemNum) props.push(item.itemNum);
                                if (item.itemALU) props.push(item.itemALU);
                                return props;
                            }

                            popupCtrl.ok = function () {
                                $modalInstance.close();
                            };

                            popupCtrl.startNewReturn = function (orderId) {
                                return returnsBL.cancelReturn().then(
                                    function cancellationSuccess() {
                                        $log.log("current return cancelled");
                                        $log.log("going to a new return for orderid " + orderId);
                                        $state.go("app.returns.return.edit.addItem", {
                                            order: orderId
                                        });
                                    },
                                    function cancellationFailure(error) {
                                        $log.log("cancel current return failed");
                                        $log.log(error);
                                        return error;
                                    }).finally(function () {
                                        $modalInstance.close();
                                    });
                            }
                        }
                    });
                }, function (error) {
                    return GenericPopupService.showPopup({
                        message: error.message,
                        title: "Error Loading Client Orders",
                        mode: "ERROR"
                    });
                }).finally(function () {
                    splashModal.opened.finally(function () {
                        splashModal.close();
                    });
                });
            }
        };

        //I suggest we modify this function to take optional parameters
        svc.showConsignLPToCartPopup = function (lpValue, cartValue) {
            return $modal.open({
                templateUrl: RETURNS_COMPONENT_PATH + "/templates/consignLpPopup.html",
                controller: function ($scope, $modalInstance) {

                    // if none filled, focus to lp
                    // if lp filled, focus to cart
                    // if both, focus to submit

                    // before user interaction, show no errors
                    // if lp not supplied or cart not supplied or lp wrong format show error

                    // on submit, check errors, set focus


                    var popupCtrl = $scope.popupCtrl = this;

                    popupCtrl.consignForm = {
                        lp: lpValue || "",
                        cart: cartValue || ""
                    };

                    popupCtrl.focus = {
                        cart: (lpValue && !cartValue) ? true : false,
                        submit: (lpValue && cartValue) ? true : false,
                        lp: (!lpValue) ? true : false
                    };

                    popupCtrl.errorMessage = null;

                    function checkForm() {
                        if (!/^LP\d{1,20}$/.test(popupCtrl.consignForm.lp) || !(popupCtrl.consignForm.cart > '')) {
                            popupCtrl.errorMessage = "All fields are required and LP must be in correct format";
                            return false;
                        }
                        else popupCtrl.errorMessage = null;
                        return true;
                    }

                    popupCtrl.consignLp = function () {
                        if (checkForm())
                            $modalInstance.close({
                                lp: popupCtrl.consignForm.lp,
                                cart: popupCtrl.consignForm.cart
                            });
                    };

                    popupCtrl.cancel = function () {
                        $modalInstance.dismiss("cancel");
                    };
                }
            });
        };
    });

})();

