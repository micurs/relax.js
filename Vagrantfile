Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provider "virtualbox" do |v|
    v.name = "relax.js"
    v.memory = 2048
    v.cpus = 4
  end
  config.vm.network "forwarded_port", guest: 3000, host: 3000
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  # allow you to get to redis
  config.vm.network "forwarded_port", guest: 6379, host: 6379

  # config.vm.synced_folder "./site", "/micurs.com"
  config.vm.synced_folder "./examples", "/examples"
  config.vm.synced_folder "./relaxjs", "/relaxjs"
  config.vm.provision :shell, :path => "setup.sh",  privileged: true
  config.vm.provision :shell, :path => "init.sh",  privileged: false, run: "always"
end
