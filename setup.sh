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
echo ' - use tsc to compile typescript to node js file'
node_install typescript
echo ' - use tsd to search downlaod and mainitain typescript type declaration file'
node_install tsd
echo ' - use node-inspector to access debug with chorome http://localhost:8080/debug?port5858'
node_install node-inspector
echo ' - use gulp to compile node typescript files, less etc.'
node_install gulp
echo ' - use bower to download and update client siode package'
node_install bower
echo ' - use nodemon to reload source code everytime they change'
node_install nodemon
echo ' - use midnight commander to easily navigate the filesystem and copy/move files around'
node_install mc


echo "= System Provision Complete "
