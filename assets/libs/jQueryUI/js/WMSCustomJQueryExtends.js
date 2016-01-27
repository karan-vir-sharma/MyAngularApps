//http://stackoverflow.com/questions/7731778/jquery-get-query-string-parameters

$.extend({
    UrlParameters: function () {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    },
    UrlParameterValue: function (name) {
        return $.UrlParameters()[name];
    }
});