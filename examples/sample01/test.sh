#!/usr/bin/env bash
curl 'localhost:3000' > result.out
echo Result differences:
sdiff result.out expected.out
echo done
