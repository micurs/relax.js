# Relaxjs frameworks + samples

This repo contains the relaxjs node module and multiple simple examples (tests) making use of this framework.

micurs.com is a full site running on node/express completely written in Typescript built on top of relaxjs.

The overall stack includes:

* relax.js - a framework for building truly RESTful web services
* node.js: the basic runtime engine
* typescript: the language for both client and server ( v 1.0 compiler )
* gulp: the build manager
* bower: the package manager

All these projects can run within a Vagrant box so you can run this on a Mac or Windows without any changes.

For more information on the Relax.js framework check this [readme](relaxjs/readme.md).

# Install on Windows

If you are on Windows I do recommend getting chocolatey at https://chocolatey.org/.
I use the PowerShell running in admin mode to install it:

```
iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))
```

After that you can install VirtiualBox and Vagrant with two simple commands:

```bash
choco install virtualbox
choco install vagrant
```

To run virtual-box through Vagrant on PC make sure you *disable hyper-v* on Windows 8.1

http://superuser.com/questions/540055/convenient-way-to-enable-disable-hyper-v-in-windows-8

Now you can close the admin console. Open a regular command prompt or powershell and CD on the directory of the project to start the VM running the site:

```bash
vagrant up
```

# Install on Mac

On a Mac I installed VirtualBox and Vagrant by downloading the apps from the web sites:

1. https://www.virtualbox.org/wiki/Downloads
2. http://www.vagrantup.com/downloads.html

After that open the terminal, cd to the directory of the project and type

```bash
vagrant up
```

# Running the examples on Vagrant

```bash
vagrant up
```

The first time this command will download the Ubuntu 14.04 LTE box (be prepared to wait a bit) and setup all the library needed to run the project with the VM.
The details for the VM environment are in the Vagrantfile. When the provisioning of the VM completes you can ssh to it:

```bash
vagrant ssh
```

Within the Ubuntu you can launch the first example:

```bash
cd /examples/sample01
node sample1.js
```

Then open your browser to `http://localhost:3000`

The second example is written in typescript. Here is how you compile and run it:

```bash
cd /examples/sample02
npm run build
npm start
```

All these example start a server listening on port 3000.



# Compile relax.js

The Realx.js framework is written in Typescript. To compile it type the following:

```bash
cd /relaxjs
gulp
```

To compile on the fly everytime you change any `*.ts` file in `/relaxjs/src` you can run the watch task define in the gulpfile.

```bash
gulp watch
```

Enjoy!
