import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elasticache from "aws-cdk-lib/aws-elasticache";

export class DataStack extends cdk.Stack {
  public readonly db: rds.DatabaseInstance;
  public readonly redisEndpointAddress: string;
  public readonly redisEndpointPort: string;
  public readonly redisSecurityGroup: ec2.SecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps & {
      prefix: string;
      vpc: ec2.IVpc;
    }
  ) {
    super(scope, id, props);

    const dbSg = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: props.vpc,
      description: "PostgreSQL security group",
      allowAllOutbound: true,
    });

    this.db = new rds.DatabaseInstance(this, "Postgres", {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSg],
      databaseName: "goodmathquestions",
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_3,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM),
      credentials: rds.Credentials.fromGeneratedSecret("gmq_admin"),
      allocatedStorage: 40,
      storageType: rds.StorageType.GP3,
      multiAz: false,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      publiclyAccessible: false,
    });

    this.redisSecurityGroup = new ec2.SecurityGroup(this, "RedisSecurityGroup", {
      vpc: props.vpc,
      description: "Redis security group",
      allowAllOutbound: true,
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, "RedisSubnetGroup", {
      cacheSubnetGroupName: `${props.prefix}-redis-subnets`,
      description: "Redis subnet group",
      subnetIds: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
    });

    const redis = new elasticache.CfnCacheCluster(this, "Redis", {
      cacheNodeType: "cache.t4g.small",
      engine: "redis",
      numCacheNodes: 1,
      vpcSecurityGroupIds: [this.redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName,
      clusterName: `${props.prefix}-redis`,
      autoMinorVersionUpgrade: true,
    });
    redis.addDependency(redisSubnetGroup);

    this.redisEndpointAddress = redis.attrRedisEndpointAddress;
    this.redisEndpointPort = redis.attrRedisEndpointPort;

    new cdk.CfnOutput(this, "DbHost", { value: this.db.dbInstanceEndpointAddress });
    new cdk.CfnOutput(this, "DbSecretArn", { value: this.db.secret?.secretArn ?? "" });
    new cdk.CfnOutput(this, "RedisEndpoint", { value: this.redisEndpointAddress });
    new cdk.CfnOutput(this, "RedisPort", { value: this.redisEndpointPort });
  }
}
