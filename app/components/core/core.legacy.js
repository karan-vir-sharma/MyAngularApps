(function () {
    var app = angular.module("app.core.legacy", ["ngCookies", "app.core.navigation", "app.core.configuration", "app.core.authentication", , "app.core.printing"]);

    var componentPath = "./app/components/core";

    app.config(function ($stateProvider) {
        $stateProvider.state("app.legacy", {
            url: "/legacy?url",
            controller: "LegacyPageController",
            controllerAs: "legacyPageCtrl",
            templateUrl: componentPath + "/legacyContainer.html",
            resolve: {
                refreshLegacyCookie: function ($q, LegacyNavigationDataService, ErrorFactory) {
                    var deferred = $q.defer();
                    LegacyNavigationDataService.refreshLegacyCookie().then(
                        function () {
                            //$log.log("refresh legacy cookie successful");
                            deferred.resolve();
                        }, function () {
                            //$log.log("failed to refresh legacy cookie");
                            deferred.reject(ErrorFactory.createStateChangeError({ message: "failed to refresh legacy cookie", reportToUser: false }));
                        }
                    );
                    return deferred.promise;
                }
            },
            data: {}
        });
    });

    app.run(function ($window, $rootScope, $log, $cookies, WmsConfiguration, ApiAuthStoreService, LegacyNavigationService, LegacyNavigationDataService, PrintingService) {
        $log.log("legacy starting up");

        // configure murl for legacy pages to access the legacy messaging service
        $window.murl = "services/Messaging.asmx/";

        // rebuild legacy nav when user is authenticated
        $rootScope.$on("ApiAuthStoreService_AuthSaved", function () {
            LegacyNavigationService.buildLegacyNav();
            LegacyNavigationDataService.refreshLegacyCookie();
        });

        // build the legacy nav if the user is already authenticated by now
        if (ApiAuthStoreService.isAuthenticated()) {
            LegacyNavigationService.buildLegacyNav();
            LegacyNavigationDataService.refreshLegacyCookie();
        }

        // configure the label printer from the legacy cookie if it's
        // not already configured in wms2
        var labelPrinter = PrintingService.printerConfig.labelPrinter;
        if (angular.isUndefined(labelPrinter) || labelPrinter === null) {
            var legacyLabelPrinterCookie = $cookies["labelPrinter"];
            if (angular.isString(legacyLabelPrinterCookie)) {
                var printerDescription = legacyLabelPrinterCookie.split("-")[1];
                PrintingService.getLabelPrinters().then(function(printers) {
                    for (var i = 0; i < printers.length; i++) {
                        if (printers[i].description === printerDescription) {
                            PrintingService.setLabelPrinter(printers[i]);
                            break;
                        }
                    }
                });
            }
        } else {
            $log.log(" label printer defined as: ", labelPrinter);
        }

        LegacyNavigationService.buildLegacyNav();
    });


    app.service("LegacyNavigationDataService", function ($http, $q, $log, WmsConfiguration) {
        this.getNavigation = function () {
            var deferred = $q.defer();

            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.LegacyApi + "/v1/getnavigation")
                    .then(function (response) {
                        //$log.log("legacy navigation retrieved successfully");
                        deferred.resolve(response.data);
                    }, function (err) {
                        //$log.log("legacy navigation retrieval failed with error");
                        deferred.reject(err);
                    });
            });
            return deferred.promise;
        };

        this.refreshLegacyCookie = function () {
            var deferred = $q.defer();
            WmsConfiguration.getConfig().then(function (config) {
                $http.get(config.environment.ApiEndpoints.LegacyApi + "/v1/RefreshLegacyCookie")
                    .success(function (data) {
                        //$log.log("legacy cookie refreshed successfully");
                        deferred.resolve(data);
                    }).error(function (data, status, headers, config) {
                        //$log.log("legacy cookie refresh failed with error");
                        deferred.reject();
                    }
                    );
            });

            return deferred.promise;
        }
    });

    app.controller("LegacyPageController", function ($stateParams, $sce, $log, WmsConfiguration) {
        var ctrl = this;
        var url = $stateParams.url;
        WmsConfiguration.getConfig().then(function (config) {
            url = url.replace(/~/, config.environment.ApiEndpoints.LegacyWms);
            url = url.replace(/\[\w+]/, function (x) {
                $log.log(x);
                return x;
            });
            ctrl.url = $sce.trustAsResourceUrl(url);
            $log.log(url);


            ctrl.environmentType = config.environment.EnvironmentType;
        });
    });

    app.factory("LegacyNavigationService", function ($log, LegacyNavigationDataService, NavigationService) {
        var deriveSectionId = function (label) {
            return label.replace(/[\s._-]+/g, "").replace(/^(.)/, function ($1) { return $1.toLowerCase(); });
        };

        var _buildLegacyNav = function () {
            $log.log("building legacy navigation");
            LegacyNavigationDataService.getNavigation().then(
                function (sections) {
                    if (typeof sections !== "undefined" && sections !== null) {
                        sections.forEach(function (section) {
                            var sectionId = deriveSectionId(section.label);
                            if (!NavigationService.sectionExists(sectionId))
                                NavigationService.createSection(sectionId, section.label);

                            if (typeof section.links !== "undefined" && section.links !== null) {
                                section.links.forEach(function (link) {

                                    NavigationService.createStateLinkInSection({
                                        sref: "app.legacy({ url: \"" + link.path + "\"})",
                                        sectionId: sectionId,
                                        linkText: link.label
                                    });
                                });
                            }
                        });
                    }
                }, function (err) {
                }
            );
        };

        return {
            buildLegacyNav: _buildLegacyNav
        };
    });

})();