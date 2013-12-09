SESSIONFILE = ite.sesion
PREFIX = $(HOME)
SESSIONPATH = $(PREFIX)/$(SESSIONFILE)
OS := $(shell uname)

install:
	ifeq ($(OS), Linux)
		sudo yum install -y npm
	endif
	ifeq ($(OS), Darwin)
		brew install npm
	npm install

run: install
	node ./srv.js

clean:
	rm -f $(SESSIONPATH)

reset: clean run
