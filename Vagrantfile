Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provider "virtualbox" do |v|
    v.name = "micurs.com"
    v.memory = 1024
    v.cpus = 4
  end

  config.vm.provision :shell, :path => "setup.sh"
  config.vm.synced_folder ".", "/micurs.com"
end
