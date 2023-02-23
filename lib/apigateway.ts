import {Construct} from 'constructs'
import {IFunction} from 'aws-cdk-lib/aws-lambda'

import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import {RestApi} from "aws-cdk-lib/aws-apigateway/lib/restapi";
import {TokenAuthorizer} from "aws-cdk-lib/aws-apigateway/lib/authorizers/lambda";

interface KOTSAPIProps {
    name: string,
    authorizerFunction: IFunction,
    environment:string
}
interface APIResourceProps {
    name: string
    lambdaFunction: IFunction
    allowedMethods: string[]

}

export class KOTSAPI extends Construct {
    public readonly api: RestApi
    public readonly authorizer: TokenAuthorizer

    constructor(scope: Construct, id: string, props: KOTSAPIProps) {
        super(scope, id)
        this.api = this.createAPIGateway(scope, id, props)
        this.authorizer = this.createAuthorizer(scope, id, props.authorizerFunction)
    }

    private createAPIGateway(
        scope: Construct,
        id: string,
        props: KOTSAPIProps
    ) {
        const api = new apiGateway.RestApi(this, id, {
            restApiName: props.name,
            deploy:true,
            deployOptions: {
                stageName: props.environment,
            },
        })
        return api
    }

    private createAuthorizer(
        scope: Construct,
        id: string,
        authorizerFunction: IFunction
    ) {
        const authorizer = new apiGateway.TokenAuthorizer(this, 'authorizer', {
            handler: authorizerFunction,
            authorizerName: 'kots-authorizer'
        });
        return authorizer
    }
    addResource(id: string, props: APIResourceProps) {
        const resource = this.api.root.addResource(props.name);
        for (const allowedMethod of props.allowedMethods) {
            resource.addMethod(allowedMethod, new apiGateway.LambdaIntegration(props.lambdaFunction),{
                authorizer: this.authorizer,
            });
        }
    }
}
