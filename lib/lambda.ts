import { Duration } from 'aws-cdk-lib'
import { IFunction, ILayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'
import { join } from 'path'

interface KOTSLambdaProps {
    path: string
    layers?: ILayerVersion[]
    environment?: {
        [key: string]: any
    }
    bundling?: {
        [key: string]: any
    }
}

export class KOTSLambda extends Construct {
    public readonly lambda: IFunction

    constructor(scope: Construct, id: string, props: KOTSLambdaProps) {
        super(scope, id)
        // Lambda
        this.lambda = this.createLambda(id, props)
    }

    private createLambda(id: string, props: KOTSLambdaProps): IFunction {
        const lambda = new NodejsFunction(this, id, {
            entry: join(__dirname, props.path),
            runtime: Runtime.NODEJS_14_X,
            handler: 'handler',
            environment: props.environment,
            bundling: props.bundling,
            layers: props.layers ? props.layers : [],
            timeout: Duration.minutes(15),
        })
        return lambda
    }
}
