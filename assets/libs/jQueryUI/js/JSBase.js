/*jslint newcap: true, plusplus: true, sloppy: true, white: true, devel: true, maxerr: 999 */
/*global jQuery, $, alert, document 
*/

//Methods that are used regularl throughtout the StorageManagement Folder's JS
var WMS = WMS || {};

WMS.JSBase = (function () {
    //If multiple sentences in an array, 
    //this transforms it to have bullet points 
    //before the individual messages
    function transformBulletPts(data) {
        var result = "";
        if (data && data.length > 0) {
            $(data).each(function (n, item) {
                result = result + "<br/>\u2022 " + item;
            });
        }
        return result;
    }

    //Ajax Call to the Web Methods
    //Mostly the calls are asynchronous
    function executeWebServiceProcedure(url, data, successFunction, errorFunction, async) {
        $.ajax({
            type: "POST",
            url: url,
            data: JSON.stringify(data),
            success: successFunction,
            error: errorFunction,
            contentType: 'application/json',
            async: (async !== null && async !== undefined) ? async : true
        });
    }

    //Convert the string to boolean
    function convertStringToBoolean(value) {
        var answer = false;
        if (value) {
            switch (value.toLowerCase()) {
                case 'y':
                    answer = true;
                    break;
                case 'yes':
                    answer = true;
                    break;
                case 'true':
                    answer = true;
                    break;
                case '1':
                    answer = true;
                    break;
                default:
                    answer = false;
            }
        }
        return answer;
    }

    function getErrorArray(array, item) {
        if (item && item.length > 0) {
            array.push(item);
        }
        return array;
    }

    function smBlockUI() {
        var properties = {
            message: 'Please Wait...'
        };
        $.blockUI(properties);
    }

    //Blocks UI when an ajax call is being made
    //This helps the user understand that some activity is taking place of the page
    function uIBlock() {
        $(document)
            .ajaxStart(function () {
                smBlockUI();
            })
            .ajaxStop($.unblockUI);
    }

    function sortDDLOptions(container) {
        smBlockUI();
        var sortArray, sortString;

        sortArray = new Array();
        sortString = '';

        container.find('OPTION').each(function (n, optItem) {
            sortArray.push($(optItem).get(0).outerHTML);
        });

        sortArray = sortArray.sort();

        $(sortArray).each(function (n, optItem) {
            sortString = sortString + optItem;
        });
        $.unblockUI();
        return sortString;
    }

    function htmlEncode(stringValue) {
        var el = document.createElement("div");
        el.innerText = el.textContent = stringValue;
        s = el.innerHTML;
        return stringValue;
    }

    //Public Methods
    return {
        TransformBulletPts: function (data) {
            return transformBulletPts(data);
        },
        ExecuteWebServiceProcedure: function (url, data, successFunction, errorFunction, async) {
            executeWebServiceProcedure(url, data, successFunction, errorFunction, async);
        },
        ConvertStringToBoolean: function (value) {
            var answer = convertStringToBoolean(value);
            return answer;
        },
        UIBlock: function () {
            uIBlock();
        },
        GetErrorArray: function (array, item) {
            var newArray = getErrorArray(array, item);
            return newArray;
        },
        SortDDLOptions: function (container) {
            var rtnSorted = sortDDLOptions(container);
            return rtnSorted;
        },
        HtmlEncode: function (stringValue) {
            var rtnValue = htmlEncode(stringValue);
            return rtnValue;
        }
    };
}());

//On Ready
$(document).ready(function () {
    WMS.JSBase.UIBlock();
});