"use strict";
(function () {
    var componentPath = "./app/components/home";
    angular.module("app.home", ["ui.router", "app.core.navigation"])
        .config(function($stateProvider) {
            $stateProvider
                .state("app.home", {
                    url: "/home", templateUrl: componentPath + "/home.html", controller: "HomeController", controllerAs: "home"
                });
        })
        .controller("HomeController", [
            function () {
                this.name = "Friend";
            }
        ]);
})();