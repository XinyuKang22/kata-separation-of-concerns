
print("""
-----------------------------------------------------------------
✨ Separation of Concerns Kata
-----------------------------------------------------------------
""".strip())
print('ℹ️ Open {tiltfile_path} in your favorite editor to get started...'.format(
    tiltfile_path=config.main_path))

services = ['file-handler']

def microservice_docker_build(name):
  local_dir = './%s' % name 
  docker_file_location = './node-services/%s/Dockerfile' % name
  return  docker_build(name,
   context='./node-services',
   only=[local_dir],
   dockerfile=docker_file_location,
   ignore=['./**/coverage', './node-services/node_modules/.cache'],
   entrypoint='yarn run run',
   live_update=[
     # when package.json changes, we need to do a full build
     fall_back_on([
      './node-services/%s/package.json' % name, 
      './node-services/%s/yarn.lock' % name]),
     # Map the local source code into the container under /app
     sync('./node-services/%s' % name, '/app/node-services/%s' % name)
   ])

[microservice_docker_build(service) for service in services]

yaml = helm('./helm')
k8s_yaml(yaml)

# Localstack (local s3 instance)
k8s_resource(workload='localstack', port_forwards=4566, labels=["infra"])

# Node-based services
k8s_resource(workload='clamav', port_forwards=3310, labels=["service"])
k8s_resource(workload='file-handler', port_forwards=4002, resource_deps=['localstack', 'clamav'], labels=["service"])

# Create Localstack s3 bucket
local_resource('localstack-buckets', cmd='cd serverless-infra && yarn && yarn deploy -c ./localstack.yml --stage local', resource_deps=['localstack'], labels=["infra"])
