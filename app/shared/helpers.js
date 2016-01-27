// Generic reusable angular helpersk
(function () {
    "use strict";

    var app = angular.module("app.helpers", [
        "ui.bootstrap.tpls"
        , "ui.bootstrap.modal"]);

    app.constant("SHARED_COMPONENT_PATH", "./app/shared");

    app.directive("clock", function ($timeout) {
        return {
            restrict: "EA",
            template:
            "<div class=\"text-center\" style=\"padding: 10px;\">" +
            "    <span>" +
            "        {{ currentTime | momentFormat:'M/DD/YYYY' }}" +
            "    </span>" +
            "    <br />" +
            "    <span>" +
            "        {{ currentTime | momentFormat:'H:mm:ss' }}" +
            "    </span>" +
            "</div>",
            link: function (scope) {
                var tick = function () {
                    scope.currentTime = moment();
                    $timeout(tick, 1000);
                }
                tick();
            }
        }
    });

    app.filter("propsFilter", function () {
        return function (items, props) {
            var out = [];

            if (angular.isArray(items)) {
                items.forEach(function (item) {
                    var itemMatches = false;

                    var keys = Object.keys(props);
                    for (var i = 0; i < keys.length; i++) {
                        var prop = keys[i];
                        var text = props[prop].toLowerCase();
                        if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                            itemMatches = true;
                            break;
                        }
                    }

                    if (itemMatches) {
                        out.push(item);
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        }
    });

    app.filter("momentFormat", function () {
        return function (dateString, format) {
            if (typeof dateString === "undefined" || dateString === null || dateString === "")
                return "";

            return moment(dateString).format(format);
        };
    });

    app.filter("timestamp", function () {
        return function (dateString) {
            if (typeof dateString === "undefined" || dateString === null || dateString === "")
                return "";

            return moment(dateString).format("M/D/YYYY h:mm:ss a");
        };
    });

    app.filter("transfersTimeStamp", function () {
        return function (dateString) {
            if (typeof dateString === "undefined" || dateString === null || dateString === "")
                return "Not Yet Unloaded";

            return moment(dateString).format("M/D/YYYY h:mm:ss a");
        };
    });

    app.filter("date", function () {
        return function (dateString) {
            if (typeof dateString === "undefined" || dateString === null || dateString === "")
                return "";

            return moment(dateString).format("M/D/YYYY");
        };
    });

    app.filter("startsWith", function ($log) {
        return function (actual, propselector, expected) {
            if (expected === "")
                return actual;

            var filter = function (item) {
                var shouldReturn = false;
                var propList = propselector(item);
                propList.forEach(function (prop) {
                    if (prop.toString().toLowerCase().indexOf(expected.toString().toLowerCase()) === 0) shouldReturn = true;
                });
                if (shouldReturn)
                    return item;
                return null;
            };

            var outList = [];

            outList = $.grep(actual, filter);

            return outList;
        }
    });
    
    app.directive("dateDiff", function () {
        return {
            restrict: "EA",
            template: "<span>{{message}}</span>",
            scope: {
                firstDate: "=",
                secondDate: "=",
                positiveSuffix: "@",
                negativeSuffix: "@"
            },
            link: function (scope) {
                var firstDate = moment(scope.firstDate);
                var secondDate = scope.secondDate ? moment(scope.secondDate) : moment();
                var diff = firstDate.diff(secondDate, "days");
                if (diff >= 0) {
                    scope.message = diff + " " + scope.positiveSuffix;
                } else {
                    scope.message = (-1 * diff) + " " + scope.negativeSuffix;
                }
            }
        };
    });

    app.directive("handleEnter", function ($timeout) {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    $timeout(function () {
                        scope.$apply(function () {
                            scope.$eval(attrs.handleEnter);
                        });
                    });
                    event.preventDefault();
                }
            });
        };
    });

    app.directive("showFocus", function ($timeout, $log) {
        return function (scope, element, attrs) {
            scope.$watch(attrs.showFocus,
              function (newValue) {
                  $timeout(function () {
                      newValue && element.focus();
                  });
              }, true);
        };
    });

    app.directive("onClickFocusTo", function ($log, $timeout) {
        return function (scope, element, attrs) {
            element.click(function () {
                $timeout(function () {
                    $("#" + attrs.onClickFocusTo).focus();
                });
            });
        }
    });

    app.directive("onEnterFocusTo", function ($log, $timeout) {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    event.preventDefault();
                    $timeout(function () {
                        $("#" + attrs.onEnterFocusTo).focus();
                    }, 100);
                }
            });
        };
    });

    app.directive("autoFocus", function ($timeout) {
        return function (scope, element, attrs) {
            if (attrs.autoFocus !== "false")
                $timeout(function () {
                    element[0].focus();
                }, 100);
        }
    });

    app.directive("disableElement", function () {
        return function (scope, element, value) {
            if (value.disableElement !== "false") {
                element[0].disabled = true;
            }
        }
    });

    app.directive("showStateChangeSplash", function ($q, $log, $timeout, $rootScope, GenericPopupService) {
        return {
            restrict: "EA",
            link: function (scope) {
                //$log.log("showStateChangeSplash: initializing..");
                var splashModalPromise = null;
                var unregisterRouteChangeStart = $rootScope.$on("$stateChangeStart", openSplash);
                var unregisterRouteChangeSuccess = $rootScope.$on("$stateChangeSuccess", closeSplash);
                var unregisterRouteChangeError = $rootScope.$on("$stateChangeError", closeSplash);



                var unregisterDestroy = scope.$on("$destroy", unregister);


                //$log.log("showStateChangeSplash: initializing complete");

                function closeSplash() {
                    //$log.log("closeSplash: ", splashModalPromise);
                    if (splashModalPromise) {
                        //$log.log("closeSplash: setting up splashModalPromise.finally");
                        splashModalPromise.then(function (splashModel) {
                            splashModalPromise = null;
                            //$log.log("showStateChangeSplash: closing splashModel");
                            splashModel.close();
                        });
                    }
                }

                function openSplash() {
                    var splashModel = GenericPopupService.showSplashMessage({
                        title: "Loading"
                    });

                    splashModalPromise = splashModel.opened.then(function () {
                        var deferred = $q.defer();
                        $timeout(function () {
                            deferred.resolve(splashModel);
                        }, 300);
                        return deferred.promise;
                    });
                }

                function unregister() {
                    $log.log("showStateChangeSplash: destroying");

                    unregisterDestroy();
                    if (unregisterRouteChangeStart) {
                        unregisterRouteChangeStart();
                        unregisterRouteChangeStart = null;
                    }
                    if (unregisterRouteChangeSuccess) {
                        unregisterRouteChangeSuccess();
                        unregisterRouteChangeSuccess = null;
                    }
                    if (unregisterRouteChangeError) {
                        unregisterRouteChangeError();
                        unregisterRouteChangeError = null;
                    }
                }
            }
        };
    });

    app.directive("loadingAnimation", function () {
        return {
            restrict: "EA",
            template: "<img src=\"./assets/img/ajax-loader-squares.gif\" alt=\"loading...\" />"
        }
    });

    app.directive("capitalize", function () {
        return {
            require: "ngModel",
            link: function (scope, element, attrs, modelCtrl) {
                var capitalize = function (inputValue) {
                    if (inputValue == undefined) inputValue = "";
                    var capitalized = inputValue.toUpperCase();
                    if (capitalized !== inputValue) {
                        modelCtrl.$setViewValue(capitalized);
                        modelCtrl.$render();
                    }
                    return capitalized;
                }
                modelCtrl.$parsers.push(capitalize);
                capitalize(scope[attrs.ngModel]);  // capitalize initial value
            }
        };
    });

    app.filter("range", function () {
        return function (input, total, start, step) {
            start = start || 0;
            step = step || 1;
            total = parseInt(total);
            for (var i = start; i < total; i += step)
                input.push(i);
            return input;
        };
    });

})();

