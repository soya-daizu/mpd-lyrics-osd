#!/bin/sh -e

export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768
export SHELL_DEBUG=all
export LC_ALL=en_US.utf8

dbus-run-session -- \
    gnome-shell --nested \
                --wayland
