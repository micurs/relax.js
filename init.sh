#!/usr/bin/env bash
echo "========== Initialize micurs.com ==============="

function gulp_install {
    echo " - Node install: $1"
    npm install $1 --save-dev  --no-bin-link > /dev/null
}

echo "+ Restore/Update all type definitions in typings"
cd /micurs.com
tsd reinstall --save --overwrite

echo "+ Npm install packages in package.json"
cd site
gulp_install gulp-typescript-compiler
gulp_install gulp-less
gulp_install gulp-uglify
gulp_install gulp-rename
gulp_install gulp-watch
gulp_install gulp-minify-css
npm install
