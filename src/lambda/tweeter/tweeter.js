const AWS = require('aws-sdk');
const secretsmanager = new AWS.SecretsManager();
import TwitterApi from 'twitter-api-v2';

exports.handler = async (event) => {
  console.log(event.Records[0].dynamodb);
  let dailyStats = event.Records[0].dynamodb;
  let dailyCases = dailyStats.positive_cases.N;
  
  const params = {
    SecretId: process.env.TWITTER_SECRET
  }

  let secret = await secretsmanager.getSecretValue(params).promise();

  const twitterClient = new TwitterApi(secret);
  
  await twitterClient.v1.tweet(`Daily COVID-19 cases: ${dailyCases}`); 
}