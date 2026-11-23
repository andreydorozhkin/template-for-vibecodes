#!/bin/sh
# Linux only. SafeLine 9.4.3+ refuses 127.0.0.1 as a site upstream, and a port
# published on 0.0.0.0 is reachable from the internet because Docker bypasses ufw.
# This adds a dummy address that is not routed from outside the host.
set -eu

addr=${1:-10.88.0.1}

case "$addr" in
  127.*|0.0.0.0|169.254.*|::1|localhost)
    echo "refusing $addr: SafeLine 9.4.3+ rejects loopback and link-local upstreams" >&2
    exit 1
    ;;
esac

if ! ip link show upstream0 >/dev/null 2>&1; then
  ip link add upstream0 type dummy
fi
ip addr replace "$addr/32" dev upstream0
ip link set upstream0 up
echo "upstream0 is $addr"
