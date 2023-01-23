# core-infra

## Overview

This serverless project will create and maintain the AWS infrastructure used to support the [ESG-Tech-Platform](https://bitbucket.org/esg-tech/esg-tech-platform/src/main/).

The infrastructure created is:

- Route 53 : has the ingress DNS mappings for the subdomain of ${SUBDOMAIN}.v2.nonprod-esgtech.co
- VPC : Network, security and naming boundary around the ${SUBDOMAIN}.v2.nonprod-esgtech.co non-global resources. VPC is provisioned with 3 subnets to permit multi-zone services.
- EKS : Kubernetes system where Hasura is deployed. Presently provisioned to use on the first VPC subnet and hence is not specifically HA.
- Node Group: The nodes of the EKS cluster are managed by AWS and do not permit SSH or other remote access.
- ECR : Container Image Registry. Hosts custom images with Hasura configured.
- RDS : The relational database that Hasura is connected to
- Roles/Polices: Various roles and policies to permit security of the EKS control plane, nodes, EKS ingress provisioning, EBS volume control, RDS access.

Installation is bootstrapped by Serverless using CloudFormation and post-customisations.

## Prerequisites

You will need to install:
- nodejs (https://nodejs.org/en/download/)
- yarn (https://classic.yarnpkg.com/lang/en/docs/install/)
- helm (https://helm.sh/docs/intro/install/)
- aws-cli (https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- Install [Serverless](https://serverless.com/framework/docs/getting-started/)
- kubectl (https://kubernetes.io/docs/tasks/tools/)
- eksctl (https://docs.aws.amazon.com/eks/latest/userguide/eksctl.html)
- jq

## Getting Started

The basics are:

- Make sure you have access to the esgtech-wrk-platform-nonprod-v2 AWS tenancy
- Set up a profile for the AWS CLI with your SSO credentials.
  - See the "Get some AWS Credentials" section of this document for more info
- Run the Serverless Framework deployer with those credentials to configure routing and certificates
- Do some manual configuration to get some signed certificates
- Run the Serverless Framework deployer with those credentials to deploy the test of the framework
- Get a coffee or go for a walk for 20-30 minutes as provisioning EKS takes a long time.
- Do some DNS magic to make Route-53 authoritative for ${SUBDOMAIN}.v2.nonprod-esgtech.co

### Quick Start

Assuming:

- you have the required cli tools
- aws cli has a profile named _serverless_ for a role that will own the EKS k8s cluster

_note:_ All the instructions from here are cluster specific, replace cluster-name with your deployed cluster name (for example `core-infra-live-eks-cluster`) for setting up.

#### Deployment

The environment variables AWS_PROFILE, STAGE and SUBDOMAIN should be set for your environment. These can be sourced from the files inside the env subdirectory for consistency; e.g.:

```bash
$ source env/nonprod
```
1. Install Serverless and other node dependencies
    ```sh
      yarn
    ```
1. Deploy the dns and certificate information `yarn sls deploy -c ./serverless-us-east-1.yaml`

    You will then have to go and add the CNAME record to your DNS provider for the SUBDOMAIN specified, and set the HOSTED_ZONE_ID environment variable

    Add this environment variable to the relevant env file (e.g. `./env/nonprod`) for future reference


2. Deploy the main section of infrastructure with `yarn sls deploy`

    You then need to configure several more environment variables for the next step: LOCAL_CERTIFICATE_ARN, GLOBAL_CERTIFICATE_ARN, SECRET_ARN

    The LOCAL_CERTIFICATE_ARN can be found by running 
    ```sh
    aws acm list-certificates
    ``` 
      Note - you want the certificate that's Domain Name is pointing to the SUBDOMAIN env var you specified earlier, and it should be in the local region

    The GLOBAL_CERTIFICATE_ARN is deployed to `us-east-1` for use by Cloudfront, and can be found by running 
    ```sh
    aws acm list-certificates --region us-east-1
    ```

    The SECRET_ARN can be found by running 
    ```sh
    aws secretsmanager list-secrets
    ```

    Add these environment variables to the relevant env file (e.g. `./env/nonprod`) for future reference

3. Connect to the EKS cluster using `aws eks update-kubeconfig --name core-infra-live-eks-cluster`
4. Add the secrets store driver helm template `helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts`
5. Install the secrets store driver `helm upgrade --install -n kube-system --set syncSecret.enabled=true csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver`
6. Apply the secrets store driver provider `kubectl apply -f https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml`
7. Enable an oidc provider `eksctl utils associate-iam-oidc-provider --cluster core-infra-live-eks-cluster --approve`
8. Create a policy for the pods to get secrets manager access:
    ```
    export POLICY_ARN=$(aws --region "$REGION" --query Policy.Arn --output text iam create-policy --policy-name hasura-deployment-policy --policy-document '{
        "Version": "2012-10-17",
        "Statement": [ {
            "Effect": "Allow",
            "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],`
            "Resource": ["$(SECRET_ARN)"]
        } ]
    }')
    ```
9. Create an IAM role with the policy attached, and add it to the eks cluster `eksctl create iamserviceaccount --name hasura-deployment-sa --cluster core-infra-live-eks-cluster --attach-policy-arn "$POLICY_ARN" --approve --override-existing-serviceaccounts`
10. Restart the AWS pods to apply the changes `kubectl delete pods -n kube-system -l k8s-app=aws-node`
11. Install the secrets manager secrets `envsubst < serverless-infra/k8s/secrets-manager.yaml | kubectl apply -f -`
12. Install the ingress controller `envsubst < serverless-infra/k8s/ingress-controller.yaml  | kubectl apply -f -`
13. Install the network load balancer `envsubst < serverless-infra/k8s/nlb-service.yaml | kubectl apply -f -`


#### Set up ECR Replication configuration
Enabling cross-account replication for ECR makes copies of the repositories in the destination account and Regions specify (Currently we use account 428414031488 for ROOT).
For cross-account replication to occur, the destination account must configure a registry permissions policy to allow replication to occur.
  1. Settings in the ECR host account: Enable cross account replication by specying the destination account name and region.

  ```
  aws ecr put-replication-configuration --region "$REGION" --replication-configuration '{
    "rules": [
      {
        "destinations": [
          {
            "region": "ap-southeast-1",
            "registryId": "{AWS_ACCOUNT_ID_REPLICATION_1}"
          },
          {
            "region": "ap-southeast-1",
            "registryId": "{AWS_ACCOUNT_ID_REPLICATION_2}"
          }
        ]
      }
    ]
  }'
  ```
 2. Swtich to AWS_PROFILE of account need setting up replicaiton
 3. Add a JSON permission policy with “CreateRepository” and “ReplicaiteImage” action. Also, specify the the ECR host repository ARN.
  ```
    aws ecr put-registry-policy --region ap-southeast-1 --policy-text '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "ReplicationAccessCrossAccount",
          "Effect": "Allow",
          "Principal": {
            "AWS": "arn:aws:iam::428414031488:root"
          },
          "Action": [
            "ecr:CreateRepository",
            "ecr:ReplicateImage"
          ],
          "Resource": "arn:aws:ecr:ap-southeast-1:{AWS_ACCOUNT_ID_REPLICATION}:repository/core-infra-live/*"
        }
      ]
    }'
  ```
#### Setting up the cluster

_note:_ When you are setting up a new cluster consider selecting a high octet range `export HIGH_OCTET="10.50"` that is not already in use by another cluster. If the subnet ip ranges are the same the VPC's cannot be linked or paired.

If you haven't created a load balancer in this AWS account you need to run this command in the AWS cli once, so that EKS can create load balancers:

```
aws iam create-service-linked-role --aws-service-name elasticloadbalancing.amazonaws.com
```
#### DNS Magic

The EKS cluster will automatically create its own random [ELB](https://ap-southeast-2.console.aws.amazon.com/ec2/v2/home?region=ap-southeast-2#LoadBalancers:sort=loadBalancerName) for ingress with an very unfriendly DNS name. We need to map the DNS name in Route 53 to something nicer that Let's Encrypt expects the applications to resolve to. So run:

```bash
aws resourcegroupstaggingapi get-resources --resource-type-filters=elasticloadbalancing:loadbalancer --tag-filters Key=kubernetes.io/cluster/core-infra-live-eks-cluster,Values=owned

# Now get the DNSName of the ELB
$ aws resourcegroupstaggingapi get-resources --resource-type-filters=elasticloadbalancing:loadbalancer --tag-filters Key=kubernetes.io/cluster/core-infra-live-eks-cluster,Values=owned | grep ARN | grep net | sed -e 's/.*arn/arn/g' -e 's/".*//g' | xargs -r aws elbv2 describe-load-balancers --load-balancer-arns | grep DNSName
```

You could also just use the AWS Console and find the load balancer with the tags:

```
 kubernetes.io/service-name=ingress-nginx/ingress-nginx
 kubernetes.io/cluster/infra-cicd-staging=owned
```

#### Update Route 53

Go to Route 53 and Add an A-Record that points `gw.${SUBDOMAIN}.v2.nonprod-esgtech.co` to be an "alias" of the ELB identified. The alias in this case would be an alias to Network Load Balancer.

![Example Route-53 DNS Entries][route-53-dns-entries]

[route-53-dns-entries]: docs/route53-dev-tools-example-entries.png "Route-53 example dev-tools entries"

_note_ : The Route-53 DNS Entries for both ELB and subdomain delegation are random and will change if the Route-53 Zone is destroyed or the EKS Cluster is destroyed

![Example DNS Made Easy Delegation DNS Entries][dnsmadeeasy-dns-entries]

[dnsmadeeasy-dns-entries]: docs/dnsmadeeasy-dns-route53-entries.png "DNS Made Easy-example subdomain delegation to Route-53"

_note_ : Double triple check that the DNS server from which you are delegating the subdomain to Route-53 has the exact DNS NS entries showing in Route-53; no more and no less. Intermittent and very hard to diagnose errors will occur to consumers of the apps if any of them are wrong. In addition, wrong entries get heavily chached in the internet and can take many many hours to repair if you discover a typo later.

This should take 5 minutes but may be an hour or so. Longer than that and there is an error in the NS entries added.

## Background and more details

### Get some AWS Credentials

EKS will automatically set the system:master administrator account to be mapped to the Role of the User who runs the serverless install. So assume a stable well known role first, so you are not personally having to be awake at 3am fixing something.

The process to get these credentials is:

1. Sign in to https://esgtech.awsapps.com/start#/
2. Select the corresponding AWS account from the list
3. On the AWSAdministratorAccess row, follow the link for "Command line or programmatic access". If this role does not appear, you will need to request access for the role on the relevant AWS account

### Route 53

To allow fully automatic SSL certificates and DNS registration we need a cloud aware DNS server,
making Route53 convenient. It's expected to be a subdomain that is delegated from the parent domain.
See: [Hosting Subdomain](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingNewSubdomain.html)