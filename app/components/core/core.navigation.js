///<reference path="~/assets/libs/angular/angular.js"/>
"use strict";
(function () {
    var app = angular.module("app.core.navigation", ["ui.router", "app.core.base", "app.core.configuration", "app.core.authentication", "app.core.printing", "app.helpers"]);

    var componentPath = "./app/components/core";
    app.config(function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise("/app/home");

        $stateProvider
            .state("app", {
                url: "/app",
                abstract: true,
                views: {
                    '@': {
                        templateUrl: componentPath + "/app.html"
                    },
                    'navigation@app': {
                        templateUrl: componentPath + "/navigation.html",
                        controller: "NavigationController",
                        controllerAs: "navCtrl"
                    }
                },
                resolve: {
                    authenticationRequired: function ($q, $log, ApiAuthStoreService, ErrorFactory) {
                        var deferred = $q.defer();
                        //$log.log("attempting to access a protected resource, checking authentication status");
                        //// check if not logged in forward to signin page
                        if (!ApiAuthStoreService.isAuthenticated()) {
                            //$log.log("not authenticated, rejecting");
                            deferred.reject(ErrorFactory.createStateChangeError({message: "not authenticated", reportToUser: false }));
                        } else {
                            //$log.log("authenticated, resolving");
                            deferred.resolve();
                        }
                        return deferred.promise;
                    },
                    config: function (WmsConfiguration) {
                        return WmsConfiguration.getConfig();
                    }
                },
                data: {}
            });
    });


    app.run(function ($rootScope, $state, $log, $timeout, ApiAuthStoreService) {
        $rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {
            $log.log("$stateChangeStart [" + fromState.name + "] --> [" + toState.name + "]");
            if (toState.name !== "signin" && !ApiAuthStoreService.isAuthenticated()) {
                event.preventDefault();
                if (fromState.name === "")
                    $state.go("signin");
            } else if (toState.name === "signin" && ApiAuthStoreService.isAuthenticated()) {
                event.preventDefault();
                if (fromState.name === "")
                    $state.go("app.home");
            }
        });
    });

    app.factory("NavigationService", function ($state, $timeout, $log, $q, $rootScope, ApiAuthStoreService) {
        var sections = [];
        var sectionsLookup = {};
        var linksLookup = {};

        var _buildNav = function () {
            var deferred = $q.defer();
            $timeout(function() {
                var states = $state.get();

                for (var i = 0; i < states.length; i++) {
                    var state = states[i];
                    if (typeof state.data === "undefined"
                        || state.data === null
                        || typeof state.data.display === "undefined"
                        || state.data.display === null)
                        continue;

                    if (!_getSection(state.data.display.sectionId))
                        _createSection(state.data.display.sectionId, state.data.display.sectionText);

                    _createStateLinkInSection({
                        sref: state.name,
                        stateOpts: state.data.display.stateOpts || {},
                        sectionId: state.data.display.sectionId,
                        linkText: state.data.display.linkText
                    });
                };

                deferred.resolve(sections);
            });
            return deferred.promise;
        };

        var _clearNav = function() {
            sections.splice(0, sections.length);
            sectionsLookup = {};
            linksLookup = {};
        };

        var _getSection = function(sectionId) {
            //$log.log("looking for section " + sectionId, sectionsLookup);
            if (sectionsLookup.hasOwnProperty(sectionId)) {
                //$log.log("found section " + sectionId);
                return sectionsLookup[sectionId];
            }
            //$log.log("section " + sectionId + " not found");
            return null;
        };

        var _createSection = function(sectionId, sectionText) {
            //$log.log("creating section " + sectionId);
            var section = {
                id: sectionId,
                text: sectionText,
                links: []
            };
            sections.push(section);
            sectionsLookup[sectionId] = section;
            return section;
        };

        var _createStateLinkInSection = function (args) {
            //$log.log("adding state link to section " + args.sectionId, args);
            var section = _getSection(args.sectionId);
            if (!section)
                throw "Cannot add link to section " + args.sectionId + ": Section does not exist";

            var uniqueLinkKey = args.sectionId + ">" + args.linkText;
            if (!linksLookup[uniqueLinkKey]) {
                linksLookup[uniqueLinkKey] = true;
                section.links.push({ text: args.linkText, state: args.sref, params: args.params || null, opts: args.stateOpts });
            } 
        };
        
        var api = {
            buildNav: _buildNav,
            clearNav: _clearNav,
            sectionExists: function(sectionId) {
                return _getSection(sectionId) !== null;
            },
            createSection: _createSection,
            createStateLinkInSection: _createStateLinkInSection,
            getNav: function () { return sections; }
        };

        $rootScope.$on("ApiAuthStoreService_AuthSaved", function () {
            api.buildNav();
        });
        $rootScope.$on("ApiAuthStoreService_AuthForgotten", function () {
            api.clearNav();
            $state.go("signin");
        });

        if (ApiAuthStoreService.isAuthenticated()) {
            api.buildNav();
        }

        return api;
    });

    app.controller("NavigationController", function ($rootScope, $state, $log, ApiAuthStoreService, NavigationService, WmsConfiguration) {
        var ctrl = this;
        ctrl.environmentName = "";

        WmsConfiguration.getConfig().then(function(config) {
            ctrl.environmentName = config.environment.EnvironmentName;
        });

        ctrl.sections = NavigationService.getNav();

        ctrl.isState = function (states) {
            return $state.includes(states);
        };
    });
})();