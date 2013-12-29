SESSIONFILE = ite.sesion
PREFIX = $(HOME)
SESSIONPATH = $(PREFIX)/$(SESSIONFILE)
OS := $(shell uname)

ifeq ($(OS), Linux)
  ifneq (,$(wildcard /etc/debian_version))
    INSTALLCMD := sudo apt-get install -y
    $(info "DEBIAN")
  else
    # if not debian, assume redhat. conditionals left in for now.
    #ifneq (,$(wildcard /etc/redhat-release))
    $(info "REDHAT")
    INSTALLCMD := sudo yum install -y
    #endif
  endif
endif

ifeq ($(OS), Darwin)
INSTALLCMD := brew install
endif

install:
	$(INSTALLCMD) npm
	npm install

run: install
	node ./srv.js

clean:
	rm -f $(SESSIONPATH)

reset: clean run
