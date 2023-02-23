#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib'

import 'source-map-support/register'

import { KotsApiStack } from '../lib/kots-api-stack'

const app = new App()

const envName: string = app.node.tryGetContext('env')
const namespace: string = app.node.tryGetContext('namespace')
    ? `-${app.node.tryGetContext('namespace')}`
    : ''
const envConfigs: any = app.node.tryGetContext(envName)

const stackName = `RT-PP-API-${envName}${namespace}`

const stack = new KotsApiStack(app, stackName, {
    // AWS Account and Region implied by the current CLI configuration.
    env: { account: envConfigs.CDK_ACCOUNT, region: envConfigs.CDK_REGION },
    envName,
    namespace,
    logLevel: envConfigs.LOG_LEVEL,
})

Tags.of(stack).add('Environment', envName)
Tags.of(stack).add('Owner', 'owner')
Tags.of(stack).add('SupportGroup', 'support-group')
Tags.of(stack).add('Name', stackName)
Tags.of(stack).add('Client', 'client')
