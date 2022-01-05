# vermont-covid-count-notifier

## Overview
This serverless solution uses a `poller` lambda function to check the daily COVID-19 case data on the [Health Vermont API](https://geodata.vermont.gov/datasets/VCGI::vt-covid-19-daily-counts-table/about) on a 5-minute interval.  If new data is found with the previous day's COVID-19 case count, it will add the item to DynamoDB.  

A DynamoDB stream is configured for new items which invokes the `tweeter` function.  The `tweeter` function uses the Twitter API (via https://github.com/PLhery/node-twitter-api-v2) to send a tweet with the updated case counts.

## Important Note
The default configuration of the DynamoDB Stream will invoke the Lambda tweet function for every new item created.  If you don't want to spam tweet, disable the stream trigger temporarily until the initial dataset is loaded then re-enable the trigger.
## Dependencies

1. AWS account
2. [Twitter API](https://developer.twitter.com/en/portal/products/elevated) Bearer Token with 'Elevated' access
3. [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)

## Deploying
1. Set `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` environment variables with your AWS Account ID and preferred region.
2. In the CDK folder: `npm run build` then `cdk deploy` (--profile {profile_name} to use a named AWS profile).
2. In the AWS console or using the AWS CLI, modify the secret value in Secrets Manager to the value of your Twitter bearer token.