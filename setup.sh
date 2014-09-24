#!/usr/bin/env bash

function install_dependency {
    echo " - Installing dependency: $1"
    sudo apt-get -y install $1  > /dev/null
}

function node_install {
    echo " - Node install: $1"
    npm install -g $1  > /dev/null
}


cho "+ apt-get update"
apt-get update > /dev/null

echo "+ intall node"
install_dependency nodejs

echo "+ intall typescript"
node_install typescript

echo "+ intall express"
node_install express

echo "+ intall gulp"
node_install gulp

echo "+ intall bower"
node_install bower

echo "= System Provision Complete "
