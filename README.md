# CloudFormation Custom Resource: S3Object

CloudFormation has no built-in way of specifying the creation of an
object within S3. It does, however, allow one to create "Custom
Resources", allowing you to specify absolutely anything, via AWS Lambda
functions. Unfortunately, Lambda functions must be stored in S3, leaving
us with a Catch-22.

While there doesn't, at the moment, appear to be a sane way around this,
we can at least make things better: S3Object is a Custom Resource Type
for CloudFormation, allowing one to save objects to S3 as part of the
stack creation process.

Chained via dependency to a Lambda function, this can be used to create
self-contained stacks which control arbitrary external resources.

## Warnings / Disclaimers

**This is mostly intended as a proof-of-concept, and there are no
guarantees should you choose to use this code in a production
environment.**

It should be noted: As of the time of this writing, CloudFormation handles
failure poorly, especially when dependencies are involved. While DependsOn
and similar (for the most part) work during create-stack, failures during
stack Update or Delete can often result in the stack going into an
irrecoverable half-updated/deleted state. For example, if an S3Object
fails to delete, that will not prevent CloudFormation from deleting the
Lambda Function it depends on.

## Files

##### cloudformation-resource-s3object.js

The basic implementation of a custom "S3Object" resource. Zip this up,
and put the result into an S3 Bucket, and you can create an otherwise
self-contained stack.

### cloudformation-noop.js

A basic "always SUCCESS" example resource. A zipped version of this file
is included, base64 encoded, in the example stack.

### example-stack.json

An example CloudFormation stack, demonstrating the creation of an S3
object (using a custom resource), deriving a Lambda function from this,
and deriving additional custom resources from that function.
