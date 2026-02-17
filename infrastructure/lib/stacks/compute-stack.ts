import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as rds from "aws-cdk-lib/aws-rds";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";

export class ComputeStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps & {
      prefix: string;
      vpc: ec2.IVpc;
      db: rds.DatabaseInstance;
      redisEndpointAddress: string;
      redisEndpointPort: string;
      domainName?: string;
      hostedZoneName?: string;
    }
  ) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
      clusterName: `${props.prefix}-cluster`,
      containerInsights: true,
    });

    const repository = new ecr.Repository(this, "WebRepository", {
      repositoryName: `${props.prefix}-web`,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 20 }],
    });

    const nextAuthSecret = new secretsmanager.Secret(this, "NextAuthSecret", {
      secretName: `${props.prefix}/nextauth-secret`,
      generateSecretString: {
        passwordLength: 48,
        excludePunctuation: true,
      },
    });

    const logGroup = new logs.LogGroup(this, "WebLogs", {
      logGroupName: `/ecs/${props.prefix}-web`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const hasDomain = Boolean(props.domainName && props.hostedZoneName);
    const fullDomainName = props.domainName;
    const zoneDomainName = props.hostedZoneName;
    const zone = hasDomain
      ? route53.HostedZone.fromLookup(this, "HostedZone", {
          domainName: zoneDomainName!,
        })
      : undefined;

    const certificate = hasDomain
      ? new acm.Certificate(this, "WebCertificate", {
          domainName: fullDomainName!,
          validation: acm.CertificateValidation.fromDns(zone!),
        })
      : undefined;

    const fargate = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "WebService", {
      cluster,
      desiredCount: 2,
      publicLoadBalancer: true,
      cpu: 512,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(repository, "latest"),
        containerPort: 3000,
        containerName: "web",
        logDriver: ecs.LogDrivers.awsLogs({
          logGroup,
          streamPrefix: "web",
        }),
        environment: {
          NODE_ENV: "production",
          PORT: "3000",
          POSTGRES_HOST: props.db.dbInstanceEndpointAddress,
          POSTGRES_PORT: props.db.dbInstanceEndpointPort,
          POSTGRES_DB: "goodmathquestions",
          REDIS_HOST: props.redisEndpointAddress,
          REDIS_PORT: props.redisEndpointPort,
          NEXTAUTH_URL: hasDomain ? `https://${fullDomainName}` : "http://localhost:3000",
        },
        secrets: {
          NEXTAUTH_SECRET: ecs.Secret.fromSecretsManager(nextAuthSecret),
          POSTGRES_USER: ecs.Secret.fromSecretsManager(props.db.secret!, "username"),
          POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(props.db.secret!, "password"),
        },
      },
      listenerPort: certificate ? 443 : 80,
      certificate,
      redirectHTTP: Boolean(certificate),
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    fargate.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200-399",
    });

    fargate.service.autoScaleTaskCount({ minCapacity: 2, maxCapacity: 10 }).scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 60,
      scaleInCooldown: cdk.Duration.seconds(90),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    if (zone && fullDomainName && zoneDomainName) {
      const recordName = fullDomainName.replace(`.${zoneDomainName}`, "");
      new route53.ARecord(this, "AlbAliasRecord", {
        zone,
        recordName: recordName === zoneDomainName ? undefined : recordName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.LoadBalancerTarget(fargate.loadBalancer)
        ),
      });
    }

    new cdk.CfnOutput(this, "EcrRepositoryUri", { value: repository.repositoryUri });
    new cdk.CfnOutput(this, "LoadBalancerDNS", { value: fargate.loadBalancer.loadBalancerDnsName });
    new cdk.CfnOutput(this, "NextAuthSecretArn", { value: nextAuthSecret.secretArn });
  }
}
