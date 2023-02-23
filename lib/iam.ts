import {
    Effect,
    IRole,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import {Environment} from "aws-cdk-lib/core/lib/environment";

export class KOTSRole extends Construct {
    public readonly dataSourceRole: IRole
    public readonly resolverRole: IRole
       public readonly dynamoDataSourceRole: IRole


    constructor(scope: Construct, id: string, env: Environment) {
        super(scope, id)
        this.dataSourceRole = this.createDataSourceServiceRole()
        this.resolverRole = this.createResolverRole()
                this.dynamoDataSourceRole = this.createDynamoDataSourceServiceRole(env)
    }

     private createDynamoDataSourceServiceRole(env: Environment) {
        const dynamoDataSourceServiceRole = new Role(
            this,
            'dynamo-data-source-service-role',
            {
                assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
                inlinePolicies: {
                    lambdaInvoke: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: [
                                    'dynamodb:PutItem',
                                    'dynamodb:GeTItem',
                                    'dynamodb:DeleteItem',
                                    'dynamodb:Scan',
                                    'dynamodb:Query',
                                    'dynamodb:UpdateItem',
                                ],
                                resources: [
                                    `arn:aws:dynamodb:${env.region}:${env.account}:table/*`,
                                ],
                            }),
                        ],
                    }),
                },
            }
        )
        return dynamoDataSourceServiceRole
    }

    private createDataSourceServiceRole() {
        const dataSourceServiceRole = new Role(
            this,
            'location-data-source-service-role',
            {
                assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
                inlinePolicies: {
                    lambdaInvoke: new PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                effect: Effect.ALLOW,
                                actions: ['lambda:invokeFunction'],
                                resources: ['*'],
                            }),
                        ],
                    }),
                },
            }
        )
        return dataSourceServiceRole
    }

    private createResolverRole() {
        const locationResolverRole = new Role(this, 'location-resolver-role', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            inlinePolicies: {
                lambdaInvoke: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                'logs:CreateLogGroup',
                                'logs:CreateLogStream',
                                'logs:PutLogEvents',
                            ],
                            resources: ['*'],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: [
                                'ec2:CreateNetworkInterface',
                                'ec2:DescribeNetworkInterfaces',
                                'ec2:DeleteNetworkInterface',
                            ],
                            resources: ['*'],
                        }),
                        new PolicyStatement({
                            effect: Effect.ALLOW,
                            actions: ['ssm:*'],
                            resources: ['*'],
                        }),
                    ],
                }),
            },
        })
        return locationResolverRole
    }
}
