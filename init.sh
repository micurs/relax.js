#!/usr/bin/env bash
echo "========== Initialize micurs.com ==============="

function node_install {
  echo " - Node install: $1"
  npm install $1 --save-dev  --no-bin-link > /dev/null
}

echo "= User defaults"
cat <<END >.node_modules
/micurs.com/site/public/components
END


echo "= relaxjs update and compile"
cd /relaxjs
sudo npm link --no-bin-link
echo "+ Restore/Update all type definitions in typings"
tsd reinstall --save --overwrite
echo "+ Npm install packages in package.json"
npm install --no-bin-link


echo "= micurs.com update and compile"
cd /micurs.com
echo "+ Restore/Update all type definitions in typings"
tsd reinstall --save --overwrite
echo "+ Npm install packages in package.json"
npm install --no-bin-link

echo "+ Bower install client-side components in bower.json"
bower install
