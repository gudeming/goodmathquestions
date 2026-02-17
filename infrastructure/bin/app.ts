import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/stacks/network-stack";
import { DataStack } from "../lib/stacks/data-stack";
import { ComputeStack } from "../lib/stacks/compute-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const prefix = app.node.tryGetContext("prefix") ?? "gmq";
const domainName = app.node.tryGetContext("domainName");
const hostedZoneName = app.node.tryGetContext("hostedZoneName");

const network = new NetworkStack(app, `${prefix}-network`, { env, prefix });

const data = new DataStack(app, `${prefix}-data`, {
  env,
  prefix,
  vpc: network.vpc,
});

data.addDependency(network);

const compute = new ComputeStack(app, `${prefix}-compute`, {
  env,
  prefix,
  vpc: network.vpc,
  db: data.db,
  redisEndpointAddress: data.redisEndpointAddress,
  redisEndpointPort: data.redisEndpointPort,
  domainName,
  hostedZoneName,
});

compute.addDependency(data);
