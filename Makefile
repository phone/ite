SESSIONFILE = ite.sesion
PREFIX = $(HOME)
SESSIONPATH = $(PREFIX)/$(SESSIONFILE)
OS := $(shell uname)

ifeq ($(OS), Linux)
INSTALLCMD := sudo yum install -y
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
