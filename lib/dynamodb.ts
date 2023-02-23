import { RemovalPolicy } from 'aws-cdk-lib'
import {
    AttributeType,
    BillingMode,
    ITable,
    Table,
} from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

import { TABLE } from '../configs/dynamodb'

export class KOTSDatabase extends Construct {
    public readonly KOTSUserTable: ITable
    public readonly KOTSUserSettingTable: ITable
    public readonly KOTSAPITokenTable: ITable

    constructor(scope: Construct, id: string, env: string | undefined) {
        super(scope, id)
        this.KOTSUserTable = this.createKOTSUserTable(env)
        this.KOTSUserSettingTable = this.createKOTSUserSettingTable(env)
        this.KOTSAPITokenTable = this.createKOTSAPITokenTable(env)
    }

    private createKOTSUserTable(env: string | undefined): ITable {
        const userTable = new Table(this, 'user-table', {
            partitionKey: { name: 'id', type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            tableName: `${TABLE.USER}-${env}`,
            removalPolicy: RemovalPolicy.DESTROY,
        })
        return userTable
    }
    private createKOTSUserSettingTable(env: string | undefined): ITable {
        const userSettingTable = new Table(this, 'user-setting-table', {
            partitionKey: { name: 'id', type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            tableName: `${TABLE.USER_SETTING}-${env}`,
            removalPolicy: RemovalPolicy.DESTROY,
        })

        userSettingTable.addGlobalSecondaryIndex({
            indexName: 'UserIdIndex',
            partitionKey: {
                name: 'userId',
                type: AttributeType.STRING,
            },
        })

        return userSettingTable
    }
    private createKOTSAPITokenTable(env: string | undefined): ITable {
        const APITokenTable = new Table(this, 'kots-api-token', {
            partitionKey: { name: 'id', type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            tableName: `${TABLE.API_TOKEN}-${env}`,
            removalPolicy: RemovalPolicy.DESTROY,
        })
        return APITokenTable
    }
}
