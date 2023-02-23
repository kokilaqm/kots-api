import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Environment} from "aws-cdk-lib/core/lib/environment";
import {KOTSRole} from "./iam";
import {KOTSDatabase} from "./dynamodb";
import {KOTSLambda} from "./lambda";
import {PATHS} from "../configs/paths";
import {KOTSAPI} from "./apigateway";
import {CognitoUserPool} from "./cognito";
import {Policy, PolicyStatement, Role, ServicePrincipal,} from 'aws-cdk-lib/aws-iam'

interface KotsAPIStackProps extends cdk.StackProps {
    envName: string
    namespace: string
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
}

export class KotsApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: KotsAPIStackProps) {
        super(scope, id, props);

        const environment = `${props.envName}${props.namespace}`
        const apiName = `KOTS-API-${environment}`
        const env: Environment = props.env as Environment
        // Policies
        const cognitoUserPoolPolicy = new PolicyStatement({
            actions: [
                'cognito-idp:GetGroup',
                'cognito-idp:AdminAddUserToGroup',
            ],
            resources: [
                `arn:aws:cognito-idp:us-east-1:${env.account}:userpool/*`,
            ],
        })
        const dynamoDBPolicy = new PolicyStatement({
            actions: [
                'dynamodb:PutItem',
                'dynamodb:GeTItem',
                'dynamodb:DeleteItem',
                'dynamodb:Scan',
            ],
            resources: [
                `arn:aws:dynamodb:${env.region}:${env.account}:table/*`,
            ],
        })
        const ssmPolicy = new PolicyStatement({
            actions: ['ssm:GetParameter', 'ssm:GetParameters'],
            resources: ['*'],
        })
        // Custom lambda resolver policy
        const authLambdaResolverPolicy: Policy = new Policy(
            this,
            'auth-lambda-access-policy',
            {
                statements: [cognitoUserPoolPolicy, dynamoDBPolicy, ssmPolicy],
            }
        )
        // Cognito IDP policy
        const cognitoIDPPolicy = new PolicyStatement({
            actions: ['cognito-idp:AdminSetUserPassword'],
            resources: ['*'],
        })
        // Create IAM role
        const roles = new KOTSRole(this, 'kots-role', env)
        // Create the database
        const db = new KOTSDatabase(this, 'kots-db', environment)
        // Authorizer
        const authorizerRole = new Role(this, 'authorizer-role', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
        });
        db.KOTSUserTable.grantReadData(authorizerRole);
        // Post confirmation
        const postConfirmationLambda = new KOTSLambda(
            this,
            'post-confirmation-lambda',
            {
                path: `${PATHS.FUNCTIONS}/postConfirmation/handler.ts`,
                environment: {
                    USER_TABLE: db.KOTSUserTable.tableName,
                }
            }
        )
        postConfirmationLambda.lambda.role?.attachInlinePolicy(
            authLambdaResolverPolicy
        )
        // Create the Cognito User Pool
        const userPool = new CognitoUserPool(this, 'userPool', {
            userPoolName: `kots-userpool-${environment}`,
            signInCaseSensitive: false,
            postConfirmationTrigger: postConfirmationLambda.lambda,
        })
        // Add groups
        userPool.addGroup("group-admin", {
            groupName: 'Admin',
            description: 'Group for Admin',
            precedence: 1,
        })
        userPool.addGroup("group-vip", {
            groupName: 'VIP',
            description: 'Group for VIP',
            precedence: 2,
        })
        userPool.addGroup("group-member", {
            groupName: 'Member',
            description: 'Group for Member',
            precedence: 3,
        })
        userPool.addGroup("group-user", {
            groupName: 'User',
            description: 'Group for User',
            precedence: 4,
        })
        const authorizerLambda = new KOTSLambda(
            this,
            'authorizer-lambda',
            {
                path: `${PATHS.FUNCTIONS}/authorizer/handler.ts`,
                environment: {
                    USER_TABLE: db.KOTSUserTable.tableName,
                    USER_POOL_ID: userPool.userPool.userPoolId,
                    CLIENT_ID: userPool.appClient.userPoolClientId
                }
            }
        )
        authorizerLambda.lambda.role?.attachInlinePolicy(
            authLambdaResolverPolicy
        )
        // Create the AppSync API
        const api = new KOTSAPI(this, 'kots-api', {
            name: apiName,
            authorizerFunction: authorizerLambda.lambda,
            environment:environment
        })

   // Create lambda functions
        const userLambda = new KOTSLambda(this, 'user-lambda', {
            path: `${PATHS.FUNCTIONS}/user/handler.ts`,
            environment: {USER_TABLE: db.KOTSUserTable.tableName},
        })
        userLambda.lambda.role?.attachInlinePolicy(authLambdaResolverPolicy)
        api.addResource('user-resource', {
            name: 'user',
            lambdaFunction: userLambda.lambda,
            allowedMethods: ['GET', 'PUT', 'POST', 'DELETE']
        })
    }
}
