Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provider "virtualbox" do |v|
    v.name = "micurs.com"
    v.memory = 2048
    v.cpus = 4
  end
  config.vm.network "forwarded_port", guest: 3000, host: 3000
  config.vm.network "forwarded_port", guest: 8080, host: 8080

  config.vm.synced_folder "./site", "/micurs.com"
  config.vm.synced_folder "./sample01", "/sample01"
  config.vm.synced_folder "./sample02", "/sample02"
  config.vm.synced_folder "./relaxjs", "/relaxjs"
  config.vm.provision :shell, :path => "setup.sh",  privileged: true
  config.vm.provision :shell, :path => "init.sh",  privileged: false, run: "always"
end
