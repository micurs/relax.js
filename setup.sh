#!/usr/bin/env bash

function install_dependency {
    echo " - Installing dependency: $1"
    sudo apt-get -y install $1  > /dev/null
}

function node_install {
    echo " - Node install: $1"
    sudo npm install -g $1  > /dev/null
}


echo "+ apt-get update"
sudo apt-get update > /dev/null

install_dependency build-essential
install_dependency git-core


echo "+ Prepare this machine to get node ..."
sudo apt-get --purge remove node
curl -sL https://deb.nodesource.com/setup | sudo bash -
install_dependency nodejs
#sudo ln -s /usr/bin/nodejs /usr/bin/node

# install_dependency npm

node_install node-gyp
node_install typescript
node_install tsd
node_install node-inspector
node_install gulp
node_install bower

echo "= System Provision Complete "
