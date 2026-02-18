import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elasticache from "aws-cdk-lib/aws-elasticache";

export class DataStack extends cdk.Stack {
  public readonly db: rds.DatabaseInstance;
  public readonly redisEndpointAddress?: string;
  public readonly redisEndpointPort?: string;
  public readonly redisSecurityGroup?: ec2.SecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps & {
      prefix: string;
      vpc: ec2.IVpc;
      enableRedis?: boolean;
    }
  ) {
    super(scope, id, props);

    const dbSg = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: props.vpc,
      description: "PostgreSQL security group",
      allowAllOutbound: true,
    });
    dbSg.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      "Allow Postgres access from within VPC"
    );

    this.db = new rds.DatabaseInstance(this, "Postgres", {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSg],
      databaseName: "goodmathquestions",
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_3,
      }),
      // Free-tier friendly sizing
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret("gmq_admin"),
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      multiAz: false,
      // Keep retention minimal for restricted/free-tier accounts
      backupRetention: cdk.Duration.days(1),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      publiclyAccessible: false,
    });

    if (props.enableRedis) {
      this.redisSecurityGroup = new ec2.SecurityGroup(this, "RedisSecurityGroup", {
        vpc: props.vpc,
        description: "Redis security group",
        allowAllOutbound: true,
      });
      this.redisSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
        ec2.Port.tcp(6379),
        "Allow Redis access from within VPC"
      );

      const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, "RedisSubnetGroup", {
        cacheSubnetGroupName: `${props.prefix}-redis-subnets`,
        description: "Redis subnet group",
        subnetIds: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
      });

      const redis = new elasticache.CfnCacheCluster(this, "Redis", {
        // Free-tier friendly sizing
        cacheNodeType: "cache.t3.micro",
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
    }

    new cdk.CfnOutput(this, "DbHost", { value: this.db.dbInstanceEndpointAddress });
    new cdk.CfnOutput(this, "DbSecretArn", { value: this.db.secret?.secretArn ?? "" });
    if (this.redisEndpointAddress && this.redisEndpointPort) {
      new cdk.CfnOutput(this, "RedisEndpoint", { value: this.redisEndpointAddress });
      new cdk.CfnOutput(this, "RedisPort", { value: this.redisEndpointPort });
    }
  }
}
