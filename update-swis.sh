#!/usr/bin/env bash

set -e

npm cache clean

cd widget/
rm -rf node_modules/swis/
npm i swis

cd ..
cd reflector/
rm -rf node_modules/swis/
npm i swis
