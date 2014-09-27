#!/usr/bin/env bash
echo "========== Initialize micurs.com ==============="

echo "= HOSTS UPDATE"

cat <<END >>.node_modules
/micurs.com/site/public/components
END

function node_install {
    echo " - Node install: $1"
    npm install $1 --save-dev  --no-bin-link > /dev/null
}

echo "+ Restore/Update all type definitions in typings"
cd /micurs.com
tsd reinstall --save --overwrite


cd site

echo "+ Npm install packages in package.json"
# gulp_install gulp
# gulp_install gulp-tsc
# gulp_install gulp-less
# gulp_install gulp-uglify
# gulp_install gulp-rename
# gulp_install gulp-watch
# gulp_install gulp-minify-css
npm install

echo "+ Bower install client-side components in bower.json"
bower install
