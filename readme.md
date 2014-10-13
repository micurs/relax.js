Relaxjs frameworks + samples
==================================

This repo contains the relaxjs node module and multiple simple examples (tests) making use of this framework.

micurs.com is a full site running on node/express completely written in Typescript built on top of relaxjs.

The overall stack includes:

* relax.js - my own real restful framework
* node.js: the basic runtime engine
* typescript: the language for both client and server ( v 1.0 compiler )
* gulp: the build manager
* bower: the package manager

The project is completely defined to run within Vagrant so you can run this on a Mac or Windows without any changes.
So the requirements for your machine are VirtualBox and Vagrant.

Install on Windows
======================

If you are on Windows I do recommend getting chocolatey at https://chocolatey.org/.
I use the PowerShell running in admin mode to install it:

```
iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))
```

After that you can install VirtiualBox and Vagrant with two simple commands:

```
choco install virtualbox
choco install vagrant
```

To run virtual-box through Vagrant on PC make sure you *disable hyper-v* on Windows 8.1

http://superuser.com/questions/540055/convenient-way-to-enable-disable-hyper-v-in-windows-8

Now you can close the admin console. Open a regular command prompt or powershell and CD on the directory of the project to start the VM running the site:

```
vagrant up
```

Install on Mac
======================

On a Mac I installed VirtualBox and Vagrant by downloading the apps from the web sites:

* https://www.virtualbox.org/wiki/Downloads

* http://www.vagrantup.com/downloads.html

After that open the terminal, cd to the directory of the project and type

```
vagrant up
```

Running the site on Vagrant
=======================

```
vagrant up
```

The first time this command will download the Ubuntu 14.04 LTE box (be prepared to wait a bit) and setup all the library needed to run the project with the VM.
The details for the VM environment are in the Vagrantfile. When the provisioning of the VM completes you can ssh to it:

```
vagrant ssh
```

Within Ubuntu you can launch the site:

```
cd /micurs.com
npm start
```

If the Javascript files are obsolete use gulp to compile the original typescript files:

```
gulp
```
