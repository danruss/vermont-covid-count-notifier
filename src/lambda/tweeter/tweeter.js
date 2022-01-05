const AWS = require('aws-sdk');
const secretsmanager = new AWS.SecretsManager();
const Twitter = requite('twitter-api-v2');

let secret;

exports.handler = async (event) => {
  //console.log(event.Records[0].dynamodb);
  let dailyStats = event.Records[0].dynamodb;
  let dailyCases = dailyStats.positive_cases.N;
  
  if (typeof secret === 'undefined' || secret === '') {
    const params = {
      SecretId: process.env.TWITTER_SECRET
    }

    secret = await secretsmanager.getSecretValue(params).promise();
  }

  const twitterClient = new Twitter.TwitterApi(secret);
  
  await twitterClient.v1.tweet(`Daily COVID-19 cases: ${dailyCases}`); 
}