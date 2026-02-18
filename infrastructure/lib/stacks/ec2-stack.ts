import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { readFileSync } from "fs";
import { join } from "path";

export interface Ec2StackProps extends cdk.StackProps {
  prefix: string;
  domainName?: string;
  keyPairName?: string;
}

export class Ec2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Ec2StackProps) {
    super(scope, id, props);

    // Use default VPC — no cost, no NAT needed
    const vpc = ec2.Vpc.fromLookup(this, "DefaultVpc", { isDefault: true });

    const sg = new ec2.SecurityGroup(this, "WebSg", {
      vpc,
      securityGroupName: `${props.prefix}-web-sg`,
      description: "GMQ single-instance web server",
      allowAllOutbound: true,
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), "SSH");
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP");
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS");

    // IAM role for SSM Session Manager (secure remote access without SSH key)
    const role = new iam.Role(this, "InstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    });

    // Elastic IP — free when attached to a running instance
    const eip = new ec2.CfnEIP(this, "Eip", {
      tags: [{ key: "Name", value: `${props.prefix}-eip` }],
    });

    // User data: inject CDK-resolved values, then run bootstrap script
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      `export GMQ_PUBLIC_IP="${eip.attrPublicIp}"`,
      `export GMQ_DOMAIN_NAME="${props.domainName ?? ""}"`,
    );
    const setupScript = readFileSync(
      join(__dirname, "../../../scripts/ec2-setup.sh"),
      "utf8"
    ).replace(/^#!\/bin\/bash\s*\n?/, "");
    userData.addCommands(setupScript);

    // Key pair: use existing or create new
    let keyPair: ec2.IKeyPair;
    if (props.keyPairName) {
      keyPair = ec2.KeyPair.fromKeyPairName(this, "ImportedKeyPair", props.keyPairName);
    } else {
      const newKp = new ec2.KeyPair(this, "KeyPair", {
        keyPairName: `${props.prefix}-key`,
        type: ec2.KeyPairType.RSA,
      });
      keyPair = newKp;

      new cdk.CfnOutput(this, "GetSshKeyCommand", {
        value: `aws ssm get-parameter --name /ec2/keypair/${newKp.keyPairId} --region ${this.region} --with-decryption --query Parameter.Value --output text > ${props.prefix}-key.pem && chmod 400 ${props.prefix}-key.pem`,
      });
    }

    const instance = new ec2.Instance(this, "Web", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: sg,
      role,
      keyPair,
      userData,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      instanceName: `${props.prefix}-web`,
    });

    new ec2.CfnEIPAssociation(this, "EipAssoc", {
      instanceId: instance.instanceId,
      allocationId: eip.attrAllocationId,
    });

    new cdk.CfnOutput(this, "PublicIp", { value: eip.attrPublicIp });
    new cdk.CfnOutput(this, "InstanceId", { value: instance.instanceId });
    new cdk.CfnOutput(this, "WebUrl", {
      value: props.domainName
        ? `https://${props.domainName}`
        : `http://${eip.attrPublicIp}`,
    });
    new cdk.CfnOutput(this, "SshCommand", {
      value: `ssh -i ${props.prefix}-key.pem ec2-user@${eip.attrPublicIp}`,
    });
  }
}
