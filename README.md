## Preview Environments

On-demand preview environment is a strategy to spin up temporary infrastructure with isolated environments on the fly. This helps us open discussion with other teams such as product and QA at an early stage of the release process and improves cross-team visibility.

You can read about it in detail **_[here]()_**

## 🏭 Architecture

Our architecture is pretty simple and intuitive, I've divided the whole architecture into three sections:

- **Setup**: We can see how we build our app and provision our infrastructure when the developer opens a new pull request and labels it. Interesting component is the _custom script_ which we'll implement.

- **Infrastructure**: We will go into some detail about our infrastructure setup with AWS ECS.

- **Access**: We will see how we leverage Cloudflare Argo Tunnel and Cloudflare Access for securing access to our temporary environments endpoint.

![architecture](./docs/assets/architecture.png)

## ❓ Why do we need it?

Let's see how this can bring benefits to our release and team workflow processes. This is an example from my personal experience.

**Usual Workflow**

Currently, QA and product reviews are tightly coupled to releases and it's often hard to roll back changes once they're in the release itself.

![usual-workflow](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/vmf2t7q1e1hl39237kal.png)

**New Workflow**

This will provide a huge benefit to QA and the Product team as they will be able to do a soft review on the changes. Product Team will no longer need to wait till the changes have reached to staging environment to review. Same with QA Team, they can test your changes right at the pull request level.

![new-workflow](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/9gag410fl2lnjzzu0s3c.png)

## 😮 Challenges

Let's look at some challenges I faced while architecting this, and how offerings from Cloudflare helped.

**SSL**
One of the big challenge was setting up SSL, because we [cannot](https://stackoverflow.com/questions/61502474/adding-aws-public-certificate-with-nginx) use certificate generated by [AWS ACM](https://aws.amazon.com/certificate-manager/) with our own custom [Nginx](https://www.nginx.com/) proxy as ACM only works with AWS services like CloudFront, ALB, API Gateway etc.

There are few approaches I saw online while researching this:

- One approach is to use [Let's Encrypt](https://letsencrypt.org/) to generate temporary ssl certs. Here's a [good implementation for this](https://github.com/askwonder/wonqa). But this presents with other issue of managing all the certs we generate through Let's Encrypt.

- Another approach is to just add a new Route 53 record and then forward it to ALB. The issue is not that we'll need to provision these resources but we'll have to provision and destroy them quite frequently!

Cloudflare [Argo Tunnel](https://www.cloudflare.com/products/tunnel/) to the rescue! With this we can simply close all the ingress and instead expose our traffic through the tunnels. After that we can create a proxied DNS record and Cloudflare can handle the SSL stuff for us!

_Here's my [previous article](https://dev.to/karanpratapsingh/exposing-resources-securely-with-argo-tunnel-ea5) where I cover argo tunnels in detail_

**Security**

The most important part of this is the security, because what's stopping me from exposing a backdoor to our AWS infrastructure either intentionally or by mistake to the internet just by simply including risky changes in my pull request? We need a secure way to expose these temporary environments.

One solution that initially came to my mind was [AWS VPN](https://aws.amazon.com/vpn/) or something similar. So that we can only allow access to the environments to the people using our VPN. Sounds good? But ultimately this would've required us to onboard every team member to setup and use VPN.

Cloudflare [Access](https://www.cloudflare.com/teams/access/) is a game changer, and it's free upto 50 users! This is just what I needed to create a secure, faster and zero trust access to the temporary environments without the VPN.

Hopefully, this will bring some collaboration with the Product, QA, Solutions team at early stages of release process at your organization.

## 🔐 License 

* See [LICENSE](/LICENSE) (MIT)

<p style="margin: 0px 10px;">  
  <a href="mailto:contact@karanpratapsingh.com">💼 Hire Me</a> | 
  <a href="https://www.paypal.me/karanpratapsingh">🍺 Donate</a> 
</p>
