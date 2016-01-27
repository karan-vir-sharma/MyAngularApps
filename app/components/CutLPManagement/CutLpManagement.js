/// <reference path="templates/Transfers.html" />
// JavaScript source code
"use strict";

(function () {
    var app = angular.module('app.CutLP.core', ["app.core.authentication",
        "ui.router",
        "ui.bootstrap.tpls", "ui.bootstrap.modal", "ui.bootstrap.popover", "app.core.base",
        "ui.bootstrap",
        "app.core.configuration"
    ]);

    var transfersApiEndPoint1 = '';
    app.constant("SHARED_COMPONENT_PATH", "./app/shared");
    app.constant("CUTLP_COMPONENT_PATH", "./app/components/CutLPManagement");
    app.config(function ($stateProvider, CUTLP_COMPONENT_PATH) {

        $stateProvider.state("LPContents", {
            url: "/CutLPManagement",
            controller: "MainCtrl1",
            controllerAs: "MainCtrl1",
            templateUrl: CUTLP_COMPONENT_PATH + "/templates/CutLPManagement.html",
            reload: true
        });
    });
    app.factory('inventoryControlService', function ($http, WmsConfiguration,$q) {        
        var api = {};
        api.GetLPContents = function (lpLocation) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                console.log(config.environment.ApiEndpoints.Inventory)
                $http.get(config.environment.ApiEndpoints.Inventory + "/adjustments/GetLPContents/" + lpLocation)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("InventoryControlApi.GetLPContents", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.ConsignLP = function (lpLocation, cartLocation) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                console.log(config.environment.ApiEndpoints.Inventory)
                $http.post(config.environment.ApiEndpoints.Inventory + "/adjustments/ConsignLp/" + lpLocation + "/" + cartLocation)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("InventoryControlApi.ConsignLP", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        api.AdjustItemInInventory = function (requestBody) {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                console.log(config.environment.ApiEndpoints.Inventory)
                $http.post(config.environment.ApiEndpoints.Inventory + "/adjustments/AdjustItem", requestBody)
                    .then(function (response) {
                        deferred.resolve(response.data);
                    }, function (rejectionWrapper) {
                        handleError("InventoryControlApi.AdjustItem", rejectionWrapper);
                        deferred.reject(rejectionWrapper);
                    });
            });
            return deferred.promise;
        };

        return api;
    });
    app.controller('MainCtrl1', function (inventoryControlService, $scope, $q, $timeout, GenericPopupService, $state, ApiAuthStoreService) {

        var ctrl = this;
        ctrl.searchText = ""
        ctrl.resultMessage = ""
        ctrl.showCartScan = false;
        ctrl.showRemoveItemScan = false;
        ctrl.isIteminLP = false;
        ctrl.showToteScan = false;
        ctrl.showDone = false;
        ctrl.showScanLPAgain = false;
        ctrl.getItemsToBeAdjusted = "";

        function setResults(message, results) {
            ctrl.showResults = true;
            ctrl.message = message;
            ctrl.results = results || [];
        }

        function setErrorResults(message, results) {
            ctrl.showErrorResults = true;
            ctrl.errorMessage = message;
            ctrl.errorResults = results || [];
        }

        ctrl.lpContentSearch = function (search) {
            if (search == '' || search == undefined)
            {
                var lpContentError = 'No Lp Scanned. Please scan a License Plate';
                ctrl.HandleErrors(lpContentError);
                ctrl.showResults = false;
                ctrl.showErrorResults = false;
            }
            else
            {
                $scope.userId = ApiAuthStoreService.getUserId();
                $scope.Error = null;
                ctrl.searchText = search;
                ctrl.showCartScan = true;
                //console.log(ctrl.searchText);
                //console.log(search);
                // Call the async method and then do stuff with what is returned inside our own then function
                var searchPromise = inventoryControlService.GetLPContents(search).then(function (d) {
                    //console.log(d.lp);
                    //console.log('Count');
                    //console.log(d.items.length);
                    if (d.lp === null)
                    {
                        ctrl.showCartScan = false;
                        setErrorResults("No LP Contents found. Please try scanning the LP again!");
                        $scope.lpLocation = ''
                        ctrl.SetFocus('lpContentSearch');
                        $scope.cutLpManagement = [];
                    }
                    else
                    {
                        ctrl.showResults = false;
                        ctrl.showErrorResults = false;
                        $scope.data = d;
                        //console.log(d.lp.items);
                        //ctrl.licensePlates = d.lp;
                        //console.log(ctrl.licensePlates);
                        $scope.licensePlates = d.lp;
                        //console.log($scope.licensePlates);
                        $scope.cutLpManagement = ctrl.ScanData($scope.data);
                        console.log('bef');
                        console.log($scope.cutLpManagement);
                        console.log('aft');
                        document.getElementById("lpContentSearch").disabled = true;

                        ctrl.SetFocus('loadLptoCart');
                        console.log('Items to be Adjusted')
                        console.log(ctrl.getItemsToBeAdjusted)
                        document.getElementById("btnLpSearch").disabled = true;
                        if(ctrl.getItemsToBeAdjusted.length <=0)
                        {
                            ctrl.showCartScan = false;
                            setErrorResults("No Items need adjustment in this LP. Please scan another LP!");
                            $scope.lpLocation = ''
                            document.getElementById("lpContentSearch").disabled = false;
                            ctrl.SetFocus('lpContentSearch');
                        }
                    }

                });

                var splashModal = GenericPopupService.showSplashMessage({
                    title: "Searching",
                    detail: "Searching for LP Contents..."
                });
                searchPromise.finally(function () {
                    splashModal.opened.finally(function () {
                        splashModal.close();
                    });
                });
            }
        };

        ctrl.AdjustInventory = function (lp, cart, item, tote, scantype) {
            switch (scantype)
            {
                case 'Cart':
                    if (cart == '' || cart == undefined || cart.indexOf('-CART') <= -1) {
                        var cartLocationError = 'No Cart or Invalid Cart Scanned. Please scan a valid Cart';
                        ctrl.HandleErrors(cartLocationError);
                        ctrl.showResults = false;
                        ctrl.showErrorResults = false;
                        $scope.cartlocation = '';
                    }
                    else
                    {
                        $scope.Error = null;
                        ctrl.MoveLP(lp, cart);
                    }
                                        
                    break;

                case 'Item':
                    ctrl.showCartScan = false;
                    ctrl.showRemoveItemScan = false;
                    ctrl.showResults = false;
                    ctrl.showErrorResults = false;
                    ctrl.ValidateItem(item);
                    if (ctrl.isIteminLP)
                    {
                        ctrl.isIteminLP = false; //resetting it to false.
                        ctrl.RemoveItemFromLP(lp, item);
                        ctrl.showToteScan = true;
                        ctrl.SetFocus('scanItemToTote');
                    }
                    else
                    {
                        var errorMessage = 'Invalid Item Scanned. Please Scan again';
                        ctrl.HandleErrors(errorMessage);
                        console.log(errorMessage);
                        ctrl.showToteScan = false;
                        ctrl.showRemoveItemScan = true;
                        ctrl.SetFocus('removeItemFromLP');
                        $scope.item = '';
                    }
                    break;

                case 'Tote':
                    if (tote == '' || tote == undefined || tote.indexOf('-TOTE-') <= -1) {
                        var toteLocationError = 'No Tote or Invalid Tote Scanned. Please scan a valid Tote';
                        ctrl.HandleErrors(toteLocationError);
                        ctrl.showResults = false;
                        ctrl.showErrorResults = false;
                        $scope.tote = '';
                    }
                    else
                    {
                        $scope.Error = null;
                        ctrl.AdjustItem(item, tote, lp);
                        ctrl.showResults = true;
                    }

                    break;
                case 'Done':

                    ctrl.showCartScan = false;
                    ctrl.showRemoveItemScan = false;
                    ctrl.showToteScan = false;
                    ctrl.showDone = true;
                    $scope.tote = ''
                    $scope.item = ''
                    $scope.lpLocation = ''
                    $scope.cartlocation = ''
                    
                    $state.reload();
                    break;

            }
        }

        ctrl.MoveLP = function (lp, cart) {
            console.log(lp);
            console.log(cart);
            var consignLPPromise = inventoryControlService.ConsignLP(lp, cart).then(function (d) {
                console.log(d);
                $scope.moveLpResult = d
                console.log('Results from Consign LP' + d.result + d.resultMessage);
                //console.log('Count');
                //console.log(d.items.length);
                if (d.moveLpResult === null || d.result == -2)
                {
                    ctrl.showCartScan = false;
                    setErrorResults("Not able to move LP. Please press 'ENTER' to reload the page and try scanning the LP again!");
                    ctrl.showScanLPAgain = true;
                    ctrl.SetFocus('scanLpAgain');
                    //Have a button or functionality to Reload the Page or Controller and Scan LP Again.
                }

                if (d.result == -1) {
                    ctrl.showCartScan = true;
                    ctrl.showRemoveItemScan = false;
                    $scope.cartlocation = ''
                    ctrl.SetFocus('loadLptoCart');
                    setErrorResults("Invalid Cart Scanned. Please scan the correct CART again!");
                }

                if (d.result == 0) {
                    ctrl.showCartScan = false;
                    ctrl.showRemoveItemScan = true;
                    console.log(document.getElementById("removeItemFromLP"));
                    ctrl.SetFocus('removeItemFromLP');
                    setResults(d.resultMessage);
                    ctrl.showErrorResults = false;
                    ctrl.showResults = true;
                }

            });

            var splashModal = GenericPopupService.showSplashMessage({
                title: "Processing LP Move Request",
                detail: "Moving LP to CART..."
            });
            consignLPPromise.finally(function () {
                splashModal.opened.finally(function () {
                    splashModal.close();
                });
            });
        };

        ctrl.AdjustItem = function (item, tote, lp) {
            console.log(item);
            console.log(tote);
            console.log(lp);
            var itemNumber;
            var virtualSku;
            var isItemAddedSuccessfully = false;
            var itemsInLp = ctrl.CalculateItemsToBeAdjusted($scope.cutLpManagement);

            if (item != null && item != 'undefined') {
                itemsInLp.forEach(function (i) {
                    if (item == i.itemNumber || item == i.virtualSku)
                    {
                        itemNumber = i.itemNumber;
                        virtualSku = i.virtualSku;
                    }
                });
            }
            else {
                ctrl.isIteminLP = false;
            }

            ctrl.adjustmentDataModel = function (itemNumber, tote, lp, virtualSku) {
                //Populate ItemNumber/Vsku from Item being passed.
                return {
                    Source: { BinLocation: '', LP: lp },
                    Destination: { BinLocation: tote, LP: '' },
                    ItemNumber: itemNumber,
                    Quantity: 1, //Only 1 item at a time.
                    Reason: 'Move',
                    FinishedGoodValues: { VirtualSKU: virtualSku, PackageItemID: null },
                    UserId: $scope.userId,
                    AdjustmentTypeID: 3,
                    TransactionTypeID: 31
                }
            };

            var requestBody = JSON.stringify(ctrl.adjustmentDataModel(itemNumber, tote, lp, virtualSku))
            
            console.log(requestBody);

            
            var adjustItemPromise = inventoryControlService.AdjustItemInInventory(requestBody).then(function (d) {
                console.log(d);
                if(d.status == 'Success')
                {
                    ctrl.showCartScan = false;
                    ctrl.showRemoveItemScan = false;
                    ctrl.showToteScan = false;
                    isItemAddedSuccessfully = true; //Add Items to Tote. Once Added, then remove the quantity.
                    ctrl.searchText = 'Item: '+item;
                    //setResults($scope.item,'Item '+ $scope.item +' Moved successfully to Tote '+ $scope.tote);
                    setResults('Item: ' + $scope.item + ' Moved successfully to Tote: ' + $scope.tote);
                    ctrl.showErrorResults = false;
                    if (isItemAddedSuccessfully) {
                        if ($scope.cutLpManagement != null && $scope.cutLpManagement.length > 0)
                            $scope.cutLpManagement.forEach(function (i) {
                                if (item == i.itemNumber || item == i.virtualSku) {
                                    i.lpQuantity = i.lpQuantity - 1;
                                    i.difference = i.packageQuantity - i.lpQuantity;
                                }
                            });
                        ctrl.getItemsToBeAdjusted = ctrl.CalculateItemsToBeAdjusted($scope.cutLpManagement);

                        if (ctrl.getItemsToBeAdjusted != null || ctrl.getItemsToBeAdjusted != 'undefined') {
                            if (ctrl.getItemsToBeAdjusted.length > 0) {
                                ctrl.showCartScan = false;
                                ctrl.showRemoveItemScan = true;
                                ctrl.showToteScan = false;
                                ctrl.SetFocus('removeItemFromLP');
                                $scope.item = '';
                                var isItemAddedSuccessfully = false;
                            }
                            else {
                                ctrl.showDone = true;
                                ctrl.showResults = false;
                                ctrl.SetFocus('doneInput');
                                $scope.lpComplete = 0;
                                console.log('show Done');
                                console.log(ctrl.showDone);
                                document.getElementById("lpContentGrid").style.visibility = 'hidden';
                                document.getElementById("lpContentSearchHeading").style.visibility = 'hidden';
                            }
                        }
                    }
                    $scope.tote = '';
                    $scope.item = '';
                }
                else
                {
                    isItemAddedSuccessfully = false;
                    ctrl.showCartScan = false;
                    ctrl.showRemoveItemScan = false;
                    ctrl.showResults = false;
                    ctrl.showErrorResults = false;
                    ctrl.showToteScan = true;
                    $scope.tote = '';
                    ctrl.SetFocus('scanItemToTote');
                    var errorMessage = d.resultMessage + '. Please Scan the Tote again!';
                    ctrl.HandleErrors(errorMessage);
                }
            });

            var splashModal = GenericPopupService.showSplashMessage({
                title: "Processing Item Adjustment",
                detail: "Moving Item to Tote..."
            });
            adjustItemPromise.finally(function () {
                splashModal.opened.finally(function () {
                    splashModal.close();
                });
            });
        };

        ctrl.RemoveItemFromLP = function (lp, item) {
            console.log(lp);
            console.log(item);

        };

        ctrl.AddItemToTote = function (item, tote) {
            console.log(item);
            console.log(tote);
            return true;

        };

        ctrl.ValidateItem = function (item) {
            console.log('inside Validate Item');
            $scope.Error = null;
            var itemsInLp = ctrl.CalculateItemsToBeAdjusted($scope.cutLpManagement);

            if (item != null && item != 'undefined') {
                itemsInLp.forEach(function (i) {
                    if (item == i.itemNumber || item == i.virtualSku) {
                        ctrl.isIteminLP = true;
                    }
                });
            }
            else
            {
                ctrl.isIteminLP = false;
            }
            console.log($scope.cutLpManagement);
            console.log('item in Lp Result');
            console.log(ctrl.isIteminLP);
        };

        ctrl.ScanData = (function (d) {
            if (d.lp != '' && d.package != '') {
                var cutLpData = new Array();
                
                d.lp.items.forEach(function (i) {
                    cutLpData.push({
                        itemNumber: i.itemNumber,
                        virtualSku: i.virtualSku,
                        lpQuantity: i.quantity,
                        packageQuantity: 0,
                        difference: ''
                    });
                });

                d.package.items.forEach(function (i) {
                    var found = false;
                    for (var idx = 0; idx < cutLpData.length; idx++) {
                        var cur = cutLpData[idx];
                        if(cur.virtualSku == i.virtualSku && cur.itemNumber == i.itemNumber)
                        {
                            found = true;
                            cur.packageQuantity = i.quantity,
                            cur.difference = cur.packageQuantity - cur.lpQuantity;
                        }
                    }
                    
                    if(!found)
                    {
                        cutLpData.push({ itemNumber: i.itemNumber, lpQuantity: 0, packageQuantity: i.quantity, difference: i.quantity});
                    }
                    

                });
                ctrl.getItemsToBeAdjusted = ctrl.CalculateItemsToBeAdjusted(cutLpData);
                console.log('after array call')
                console.log(ctrl.getItemsToBeAdjusted)
                return cutLpData;
            }
            return new Array();
        });

        ctrl.CalculateItemsToBeAdjusted = (function (itemsCutFromLp) {
            var itemsValidForAdjustment = new Array(); 
            itemsCutFromLp.forEach(function (i){
                if(i.difference < 0)
                {
                    itemsValidForAdjustment.push(i);
                }
            });
            return itemsValidForAdjustment;
           
        });

        ctrl.HandleErrors = (function (error) {
            $scope.Error = error;
            console.log($scope.Error);
        });

        ctrl.SetFocus = (function (elementId) {
            window.setTimeout(function () {
                document.getElementById(elementId).focus();
            }, 0);
        });

        ctrl.ReloadAll = (function () {
            $state.reload();
        });

    });

})();



