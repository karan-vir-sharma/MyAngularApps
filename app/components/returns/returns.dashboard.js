"use strict";

(function () {
    var app = angular.module("app.returns.dashboard", ["app.returns.core", "app.users.data", "ui.bootstrap"]);

    app.config(function ($stateProvider, RETURNS_COMPONENT_PATH) {
        $stateProvider.state("app.returns.dashboard", {
            url: "/dashboard",
            templateUrl: RETURNS_COMPONENT_PATH + "/templates/_dashboard.html",
            resolve: {
                pageData: function (ReturnsDashboardDataService) {
                    return ReturnsDashboardDataService.getActiveReturns();
                },
                userData: function (UsersDataService) {
                    return UsersDataService.getUsersByPageName("Returns 2");
                }
            },
            controller: "ReturnsDashboardController",
            controllerAs: "dashCtrl"
        });
    });

    app.controller("ReturnsDashboardController", function ($scope, $log, $timeout, pageData, userData, ReturnsDashboardDataService, GenericPopupService, returnsDataAccess) {
        var ctrl = this;

        ctrl.pageData = pageData;
        ctrl.userData = userData;

        ctrl.ops = {
            changeUser: function (orderId, userName) {
                var ui = null;
                var op = null;

                ui = GenericPopupService.showSplashMessage({
                    title: "assigning order #" + orderId + " to " + userName + "..."
                });

                var oldUserId = $.map(ctrl.pageData, function (item) {
                    if (item.orderId === orderId) return item.userId;
                    else return null;
                })[0];

                var newUserId = $.map(ctrl.userData, function (item) {
                    if (item.userName === userName) return item.userId;
                    else return null;
                })[0];

                op = ReturnsDashboardDataService.changeUser(orderId, newUserId, oldUserId);

                op.then(function () {
                    ReturnsDashboardDataService.getActiveReturns().then(function (results) {
                        ctrl.pageData = results;
                        $log.log(ctrl.pageData);
                    });
                });

                op.finally(function () {
                    $timeout(function () { ui.opened.finally(function () { ui.close(); }); }, 850);
                });
            },
            killReturn: function (orderId) {
                var ui = null;
                var op = null;

                ui = GenericPopupService.showSplashMessage({
                    title: "killing return for order #" + orderId + "..."
                });

                op = returnsDataAccess.killReturn(orderId);

                op.then(function () {
                    ReturnsDashboardDataService.getActiveReturns().then(function (results) {
                        ctrl.pageData = results;
                        $log.log(ctrl.pageData);
                    });
                });

                op.finally(function () {
                    $timeout(function () { ui.opened.finally(function () { ui.close() }); }, 850);
                });
            }
        };
    });

    app.service("ReturnsDashboardDataService", function ($http, $q, $log, WmsConfiguration) {
        var api = {};
        var configPromise = WmsConfiguration.getConfig();

        api.getActiveReturns = function () {
            var task = $q.defer();

            $q.when(configPromise).then(function (config) {
                $http.get(config.environment.ApiEndpoints.Returns + "/v1/activereturns")
                    .then(function (result) {
                        task.resolve(result.data);
                    }).catch(function (error) {
                        task.reject(error);
                    });
            });

            return task.promise;
        };

        api.changeUser = function (orderId, newUserId, oldUserId) {
            var task = $q.defer();

            $q.when(configPromise).then(function (config) {
                $log.log(orderId, newUserId, oldUserId);
                $http.post(config.environment.ApiEndpoints.Returns + "/v1/assignreturn?orderId=" + orderId + "&newUserId=" + newUserId + "&oldUserId=" + oldUserId, {})
                    .then(function () {
                        task.resolve();
                    }).catch(function (error) {
                        task.reject(error);
                    });
            });

            return task.promise;
        };

        return api;
    });

    app.directive("listcheck", function () {
        return {
            require: 'ngModel',
            scope: {
                listToCheck: '='
            },
            link: function (scope, elem, attrs, ctrl) {
                ctrl.$validators.listcheck = function (modelValue, viewValue) {
                    if (ctrl.$isEmpty(modelValue) || scope.listToCheck === undefined) {
                        return true;
                    }
                    if (scope.listToCheck.some(function (item) { return item.userName === viewValue; })) {
                        return true;
                    }
                    return false;
                };
            }
        };
    });

})();