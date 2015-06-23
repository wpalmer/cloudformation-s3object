var aws = require('aws-sdk');
var s3 = new aws.S3({apiVersion: '2006-03-01'});

exports.handler = function(event, context) {
    try {
        var responseBody = JSON.stringify({
            Status: "SUCCESS",
            Reason: "noop",
            PhysicalResourceId: event.LogicalResourceId,
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            Data: {}
        });

        var https = require("https");
        var url = require("url");

        var parsedUrl = url.parse(event.ResponseURL);
        var options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: "PUT",
            headers: {
                "content-type": "",
                "content-length": responseBody.length
            }
        };

        var request = https.request(options, function(response) {
            context.done();
        });

        request.on("error", function(error) {
            context.fail("sendResponse Error: " + error);
        });

        // write data to request body
        request.write(responseBody);
        request.end();
    } catch(e){
        context.fail("Exception when sending response: " + e);
    }
};
