ajax = function(method, options) {
    return $.ajax({
        type: method,
        async: false, //options.asynchronous || false,
        url: options.resource,
        data: JSON.stringify(options.data),
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        success: function(xhr) {
            return options.success(xhr);},
        error: function(xhr, text_status, error_thrown) {
            if (!(options.reportspec != null)) {
                if (xhr.responseText != null) {}}
            if (options.error != null) {
                return options.error(xhr, text_status, error_thrown);}}
    }).responseJSON;
};

get = function(options) {
    return ajax('GET', options);
};

post = function(options) {
    return ajax('POST', options);
};
