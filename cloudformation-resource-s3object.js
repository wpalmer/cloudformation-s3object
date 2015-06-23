var aws = require('aws-sdk');
var s3 = new aws.S3({apiVersion: '2006-03-01'});

exports.handler = function(event, context) {
    var params;

    try {
        if( !event.ResourceProperties.PutObject ){
            sendResponse(event, context, "FAILED",
                "Invalid Definition", {Error: "PutObject was not an object"}
            );
            return;
        }

        // Check for required parameters
        if(
            ![["Bucket"], ["Key"], ["Body", "Body.Base64", "Body.Json"]].every(function(params){
                if(
                    !params.some(function(param){
                        return (param in event.ResourceProperties.PutObject);
                    })
                ){
                    sendResponse(event, context, "FAILED",
                        "Invalid Definition", {Error: "PutObject." + params[0] + " was not specified"}
                    );
                    return false;
                }

                return true;
            })
        ){
            return;
        }

        if (event.RequestType == "Delete") {
            params = {
                Bucket: event.PhysicalResourceId.split('/').slice(0,1).join(''),
                Key: event.PhysicalResourceId.split('/').slice(1).join('/')
            };

            s3.deleteObject(params, function(err, data) {
                if (err) {
                    sendResponse(event, context, "FAILED", String(err.message), {Error: err});
                } else if( event.RequestType == "Delete" ){
                    sendResponse(event, context, "SUCCESS", "", {});
                }
            });
            return;
        }

        // RequestType == "Update" | "Create"
        params = event.ResourceProperties.PutObject;
        if ("Body.Base64" in params) {
            // handle "Body.Base64", as CloudFormation templates can't easily contain true binary data
            params.Body = Buffer(params["Body.Base64"], 'base64');
            delete params["Body.Base64"];
        } else if ("Body.Json" in params) {
            // handle "Body.Json", so that pure Json doesn't need to be double-encoded
            params.Body = JSON.stringify(params["Body.Json"]);
            delete params["Body.Json"];
        }

        // Update and Create, both translate to "put"
        s3.putObject(params, function(err, data) {
            if (err) {
                sendResponse(event, context, "FAILED", String(err.message), {});
            } else {
                data.Bucket = event.ResourceProperties.PutObject.Bucket;
                data.Key = event.ResourceProperties.PutObject.Key;

                sendResponse(event, context, "SUCCESS", "", data);
            }
        });
    } catch(e){
        console.log("Exception in handler: " + e);
        sendResponse(event, context, "FAILED", "Internal Error in Lambda function: " + e, {Error: e});
    }
};

// Sends response to the pre-signed S3 URL
// Code based on example from CloudFormation User Guide "Walkthrough: Refer to Resources in Another Stack"
// http://goo.gl/4kr3To
function sendResponse(event, context, responseStatus, responseReason, responseData) {
    try {
        var responseBody = JSON.stringify({
            Status: responseStatus,
            Reason: responseReason,
            PhysicalResourceId: (responseStatus == "SUCCESS") ? (
                event.ResourceProperties.PutObject.Bucket + '/' +
                event.ResourceProperties.PutObject.Key
            ) : "",
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            Data: responseData
        });

        if (responseStatus == "FAILED") {
            // not a context.fail() per se, we are processing the request "correctly"
            // But we should still log *something*
            console.log("FAILURE response: " + responseBody);
        }

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
        context.fail("Exception in sendResponse: " + e);
    }
}
