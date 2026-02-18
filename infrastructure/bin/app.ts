import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/stacks/network-stack";
import { DataStack } from "../lib/stacks/data-stack";
import { ComputeStack } from "../lib/stacks/compute-stack";
import { Ec2Stack } from "../lib/stacks/ec2-stack";

const app = new cdk.App();

const contextAccount = app.node.tryGetContext("account");
const contextRegion = app.node.tryGetContext("region");
const costMode = (app.node.tryGetContext("costMode") ?? "free") as "free" | "standard";
const deployMode = (app.node.tryGetContext("deployMode") ?? "ecs") as "ecs" | "ec2";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? contextAccount,
  region: process.env.CDK_DEFAULT_REGION ?? contextRegion ?? "us-east-1",
};

const prefix = app.node.tryGetContext("prefix") ?? "gmq";
const domainName = app.node.tryGetContext("domainName");

function parseBool(v: unknown, defaultValue: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.toLowerCase() === "true") return true;
    if (v.toLowerCase() === "false") return false;
  }
  return defaultValue;
}

if (deployMode === "ec2") {
  // ─── Single EC2 instance: everything on one machine (Free Tier) ───
  new Ec2Stack(app, `${prefix}-ec2`, {
    env,
    prefix,
    domainName,
    keyPairName: app.node.tryGetContext("keyPairName"),
  });
} else {
  // ─── ECS Fargate: multi-stack architecture ───
  const hostedZoneName = app.node.tryGetContext("hostedZoneName");
  const hostedZoneId = app.node.tryGetContext("hostedZoneId");
  const certificateArn = app.node.tryGetContext("certificateArn");
  const deployComputeContext = app.node.tryGetContext("deployCompute");
  const enableRedisContext = app.node.tryGetContext("enableRedis");

  const isFreeMode = costMode === "free";
  const deployCompute = parseBool(deployComputeContext, true);
  const enableRedis = parseBool(enableRedisContext, !isFreeMode);

  const network = new NetworkStack(app, `${prefix}-network`, {
    env,
    prefix,
    isFreeMode,
  });

  const data = new DataStack(app, `${prefix}-data`, {
    env,
    prefix,
    vpc: network.vpc,
    enableRedis,
  });

  data.addDependency(network);

  if (deployCompute) {
    const compute = new ComputeStack(app, `${prefix}-compute`, {
      env,
      prefix,
      vpc: network.vpc,
      db: data.db,
      redisEndpointAddress: data.redisEndpointAddress,
      redisEndpointPort: data.redisEndpointPort,
      domainName,
      hostedZoneName,
      hostedZoneId,
      certificateArn,
      isFreeMode,
    });

    compute.addDependency(data);
  }
}
