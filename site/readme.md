Micurs.com
==================================

micurs.com is a site running on node/express completely written in Typescript.

The overall stack includes:

* relax.js - my own real restful framework
* node.js: the basic runtime engine
* typescript: the language for both client and server ( v 1.0 compiler )
* gulp: the build manager
* bower: the package manager

The project is completely defined to run within Vagrant so you can run this on a Mac or Windows without any changes.
So the requirements for your machine are VirtualBox and Vagrant.

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
cd /micurs.com/site
node bin/app.js
```

If the Javascript files are obsolete use gulp to compile the original typescript files:

```
gulp
```


ToDo
======================

- setup gulp to watch typescript [done]
- setup tsd to get typeinfo [done]
- build basic routing algorithm to call verbs methods on class resources.
- import bootstrap javascript
- select layout
- build resume in json format
- use angular to display resume
- get angular basic to work
