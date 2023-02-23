import {Logger} from '@aws-lambda-powertools/logger'
import {Handler} from 'aws-lambda'
import {DynamoDB} from "aws-sdk";

const logger = new Logger()
const dynamodb = new DynamoDB.DocumentClient();

export const handler: Handler = async (event, context, callback) => {
    let result: any
    try {
        logger.info(event)
        const queryStringParameters = event.queryStringParameters || {}
        const operation = event.httpMethod

        const body = JSON.parse(event.body || '{}')

        switch (operation) {
            case 'GET': {
                const getItemParams = {
                    TableName: process.env.USER_TABLE as string,
                    Key: {id: queryStringParameters.id},
                }
                const {Item} = await dynamodb.get(getItemParams).promise()
                result = Item
                break
            }
            case 'PUT': {
                const createItemParams = {
                    TableName: process.env.USER_TABLE as string,
                    Item: body.item,
                    ConditionExpression: 'attribute_not_exists(id)',
                }
                await dynamodb.put(createItemParams).promise()
                result = body.item
                break
            }
            case 'POST': {
                const updateItemParams = {
                    TableName: process.env.USER_TABLE as string,
                    Key: {id: queryStringParameters.id},
                    UpdateExpression: 'set #name = :name, #country = :country, #zipCode = :zipCode',
                    ExpressionAttributeNames: {'#name': 'name', '#country': 'country', '#zipCode': 'zipCode'},
                    ExpressionAttributeValues: {
                        ':name': body.name,
                        ':country': body.country,
                        ':zipCode': body.zipCode,
                    },
                    ReturnValues: 'ALL_NEW',
                }
                const {Attributes} = await dynamodb.update(updateItemParams).promise()
                result = Attributes
                break
            }
            case 'DELETE': {
                const deleteItemParams = {
                    TableName: process.env.USER_TABLE as string,
                    Key: {id: queryStringParameters.id},
                    ReturnValues: 'ALL_OLD',
                }
                const {Attributes} = await dynamodb.delete(deleteItemParams).promise()
                result = Attributes
                break
            }
            default:
                result = {error: `Unsupported operation "${operation}"`}
        }
    } catch (err) {
        logger.error(`Error : ${err}`)
        result = err
    }
    return {
        statusCode: result instanceof Error ? 500 : 200,
        body: JSON.stringify(result),
    }
}
