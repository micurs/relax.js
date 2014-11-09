# Relax.js frameworks + samples

Welcome to the Relax.js node project. This framework is still under development and it is not ready for any use in a production environment.

Relax.js is a simple node framework for building truly RESTful web applications in Javascript (or Typescript) using node.js.

This repo contains the actual module (in the `relaxjs` folder) and a few working samples in the `examples/` folder.

The entire repo can run within a Vagrant box (as Ubuntu 64bit) so you can compile and run this on a Mac or
Windows without any changes.

- For more information on how to compile and change Relax.js check this [readme](relaxjs/readme.md).
- Also check the [wiki](https://github.com/micurs/relax.js/wiki) to understand how it works.

# Install from npm

```
npm install relaxjs
```

Will download the latest version from npm.
You can use relax.js from javascript in full. If you want to use it using Typescript the project contains
a type definition file ``relaxjs.d.ts``.

you can use it from your typescript source files:

```
///<reference path='node_modules/relaxjs/dist/relaxjs.d.ts' />
```


# Running on Vagrant

First clone the repo on your machine the instal VirtualBox and Vagrant

## Install Vagrant on Windows

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

## Install Vagrant on Mac

On a Mac I installed VirtualBox and Vagrant by downloading the apps from the web sites:

1. https://www.virtualbox.org/wiki/Downloads
2. http://www.vagrantup.com/downloads.html

After that open the terminal, cd to the directory of the project and type

```bash
vagrant up
```

# Compile the Relax.js module

The Relax.js framework is written in Typescript. To compile it type the following:

```bash
cd /relaxjs
gulp
```

To compile on the fly every time you change any `*.ts` file in `/relaxjs/src` you can run the watch task define in the gulpfile.

```bash
gulp watch
```

# Running the examples

```bash
vagrant up
```

The first time this command will download the Ubuntu 14.04 LTE box (be prepared to wait a bit) and setup all the library needed to run the project with the VM.
The details for the VM environment are in the Vagrantfile. When the provisioning of the VM completes you can ssh to it:

```bash
vagrant ssh
```

Within the Ubuntu you can launch the first example (**sample01**):

```bash
cd /examples/sample01
node sample1.js
```

Then open your browser to `http://localhost:3000`

The other examplea (**sample02 to 04**) are written in Typescript. Here is how you compile and run them:

```bash
cd /examples/sample02
npm run build
npm start
```

All these examples start a server listening on port 3000.

Read more on how to use Relax.js on the [wiki](https://github.com/micurs/relax.js/wiki).

Enjoy!
