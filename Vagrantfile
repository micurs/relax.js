Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provider "virtualbox" do |v|
    v.name = "micurs.com"
    v.memory = 1024
    v.cpus = 4
  end
  config.vm.network "forwarded_port", guest: 3000, host: 3000

  config.vm.synced_folder ".", "/micurs.com"
  config.vm.provision :shell, :path => "setup.sh",  privileged: true
  config.vm.provision :shell, :path => "init.sh",  privileged: false
end
