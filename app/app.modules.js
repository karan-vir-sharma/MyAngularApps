///<reference path="~/assets/libs/angular/angular.js"/>
"use strict";
(function () {
    var app = angular.module("app", [
        "app.core.configuration",
        "app.core.authentication",
        "app.core.legacy",
        "app.core.messaging",
        "app.core.navigation",
        "app.home",
        "app.returns"
    ]);
})();