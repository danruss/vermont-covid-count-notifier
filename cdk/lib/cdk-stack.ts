import * as path from 'path';

import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import { Rule, Schedule } from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as sources from '@aws-cdk/aws-lambda-event-sources';
import * as iam from '@aws-cdk/aws-iam';
import { BillingMode, StreamViewType } from '@aws-cdk/aws-dynamodb';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table to store our data
    let dynamoTable = new dynamodb.Table(this, 'covid-tracker', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: {name: 'SK', type: dynamodb.AttributeType.NUMBER }, // Required for efficient sorting (get last item timestamp)
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE
    });

    // Poller Lambda, permissions and trigger (every 5 min)
    const pollerRole = new iam.Role(this, 'pollerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    
    pollerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    dynamoTable.grantReadWriteData(pollerRole);

    let poller = new lambda.Function(this, 'poller', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda/poller')),
      handler: 'poller.handler',
      role: pollerRole,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        STATE: 'Vermont'
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024
    });

    new Rule(this, 'pollerRule', {
      schedule: Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(poller)]
    })

    // Secret to store Twitter bearer token along with IAM role for Lambda Tweeter function
    const secret = new secretsmanager.Secret(this, 'Secret');

    const tweeterRole = new iam.Role(this, 'tweeterRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    
    tweeterRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    secret.grantRead(tweeterRole);

    // DynamoDB Stream function to tweet when new data received
    let tweeter = new lambda.Function(this, 'tweeter', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda/tweeter')),
      handler: 'tweeter.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      role: tweeterRole,
      environment: {
        TWITTER_SECRET: secret.secretArn
      }
    });

    tweeter.addEventSource(new sources.DynamoEventSource(dynamoTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 1,
      retryAttempts: 3
    }));
  }
}
