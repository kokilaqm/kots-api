import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import {
    AccountRecovery, CfnUserPoolGroup,
    IUserPool,
    StringAttribute,
    UserPool, VerificationEmailStyle,
} from 'aws-cdk-lib/aws-cognito'
import { IFunction } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import {int} from "aws-sdk/clients/datapipeline";
import {IUserPoolClient} from "aws-cdk-lib/aws-cognito/lib/user-pool-client";

interface UserPoolProps {
    userPoolName: string
    signInCaseSensitive: boolean
    postConfirmationTrigger: IFunction
}
interface UserPoolGroupProps {
    groupName: string
    description: string
    precedence: int
}

export class CognitoUserPool extends Construct {
    public readonly userPool: IUserPool
    public readonly appClient: IUserPoolClient

    constructor(scope: Construct, id: string, props: UserPoolProps) {
        super(scope, id)
        // Notes Api
        this.userPool = this.createUserPool(id, props)
        this.appClient = this.createAppClient()
    }

    private createUserPool(id: string, props: UserPoolProps): IUserPool {
        const userPool = new UserPool(this, id, {
            userPoolName: props.userPoolName,
            signInCaseSensitive: props.signInCaseSensitive,
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            autoVerify: { email: true },
            userVerification: {
                emailSubject: 'Verify your email for KOTS app!',
                emailBody: 'Thanks for signing up to KOTS app! Your verification code is {####}',
                emailStyle: VerificationEmailStyle.CODE,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: false,
                },
                fullname:{
                    required: true,
                    mutable: false,
                },
            },
            customAttributes: {
                country: new StringAttribute({
                    minLen: 1,
                    maxLen: 15,
                    mutable: false,
                }),
                zipcode: new StringAttribute({
                    minLen: 1,
                    maxLen: 15,
                    mutable: false,
                })
            },
            passwordPolicy: {
                minLength: 10,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
                tempPasswordValidity: Duration.days(3),
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            lambdaTriggers: {
                postConfirmation: props.postConfirmationTrigger,
            },
        })
        userPool.applyRemovalPolicy(RemovalPolicy.DESTROY)
        return userPool
    }

    private createAppClient(): IUserPoolClient {
        const appClient: IUserPoolClient = this.userPool.addClient('app-client', {
            userPoolClientName: 'app-client',
            authFlows: { userPassword: true },
        })

        return appClient
    }

    addGroup(id: string, props: UserPoolGroupProps) {
        new CfnUserPoolGroup(
            this,
            id,
            {
                userPoolId: this.userPool.userPoolId,
                groupName: props.groupName,
                description: props.description,
                precedence: props.precedence,
            }
        )
    }
}
