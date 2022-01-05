const axios = require('axios');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

const VT_API = 'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/VIEW_EPI_DailyCount_PUBLIC_r3/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json';

exports.handler = async (event) => {
  let results, max_timestamp;
  
  try {
    const response = await axios.get(VT_API);
    
    results = response.data.features;
    console.log(`Found ${results.length} features`);
  } catch (err) {
    console.error(err);
  }
  
  try {
    let params = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': process.env.STATE
      },
      Limit: 1,
      ScanIndexForward: false // backwards down the number line
    }
    
    let queryResults = await docClient.query(params).promise();
    max_timestamp = queryResults.Items[0].SK;
  } catch (err) {
    console.error(err);
  }
  
  let itemsAdded = 0;
  
  // Iterate backwards over the results until we hit our cutoff for data already in Dynamo
  for (let i = (results.length-1); i >= 0 ; i--) {
    let result = results[i].attributes;

    if (result.date > max_timestamp) {
      
      
      try {
        let date = new Date(result.date);
        let friendlyDate = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
        
        let putParams = {
          TableName: process.env.TABLE_NAME,
          Item: {
            PK: process.env.STATE,
            SK: result.date,
            friendlyDate: friendlyDate,
            ...result
          }
        }
        
        await docClient.put(putParams).promise();
        itemsAdded++;
        
      } catch (err) {
        console.error(err);
      }
    }
  }
  
  console.log(`Added ${itemsAdded} items`);
}