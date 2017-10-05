.PHONY: all
all:

# Must set SHELL for PATH for some reason.
SHELL := /bin/bash
PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))node_modules/.bin:$(PATH)

.PHONY: clean
clean:
	rm -rf build/

.PHONY: dirs
dirs:
	@mkdir -p build

npm_package_name := $(shell node -e 'console.log(require("./package.json").name)')
npm_package_description := $(shell node -e 'console.log(require("./package.json").description)')
npm_package_version := $(shell node -e 'console.log(require("./package.json").version)')
npm_package_homepage := $(shell node -e 'console.log(require("./package.json").homepage)')

define banner
/*!
 * $(npm_package_name) - $(npm_package_description)
 * @version v$(npm_package_version)
 * @link $(npm_package_homepage)
 */
endef

export banner

define banner_browser
/*!
 * $(npm_package_name).browser - $(npm_package_description)
 * @version v$(npm_package_version)
 * @link $(npm_package_homepage)
 */
endef

export banner_browser

.PHONY: build
build: build/hanewinpgp.js build/hanewinpgp-min.js | dirs

build/hanewinpgp.js: src/*.js | dirs package.json
	( echo -e "$$banner\n"; \
	echo -e "var VERSION = '$(npm_package_version)';\n"; \
	cat src/*.js ) >build/hanewinpgp.js
   
build/hanewinpgp-min.js: build/hanewinpgp.js | dirs node_modules
	uglifyjs $< -o $@ --preamble "$$banner"

.PHONY: build-browser
build-browser: build/hanewinpgp.browser.js build/hanewinpgp.browser-min.js | dirs

build/hanewinpgp.browser.js: build/hanewinpgp.js | dirs package.json node_modules
	( echo -e "$$banner_browser\n"; \
	browserify -r ./build/hanewinpgp.js:hanewinpgp -x crypto ) \
	>build/hanewinpgp.browser.js

build/hanewinpgp.browser-min.js: build/hanewinpgp.browser.js | dirs package.json node_modules
	uglifyjs $< -o $@ --preamble "$$banner_browser"

node_modules: package.json
	# Apparently, npm install doesn't update node_modules stamp.
	npm install && touch node_modules

.PHONY: build-nodeunit
build-nodeunit: node_modules/nodeunit/dist/browser/nodeunit.js | node_modules

node_modules/nodeunit/dist/browser/nodeunit.js: node_modules
	cd node_modules/nodeunit && make -i browser

build/tests.js: test/encrypt.js build/hanewinpgp.js | node_modules
	browserify -r ./test/encrypt.js -o build/tests.js -x tmp -x fs -x child_process -x crypto

.PHONY: dist
dist: build build-browser
	cp build/hanewin*.js dist/

.PHONY: docs
docs: API.md

API.md: node_modules src/*.js
	jsdoc2md -f src/*.js > API.md

.PHONY: lint
lint: build/hanewinpgp.js | node_modules
	jshint --reporter node_modules/jshint-stylish/index.js build/hanewinpgp.js

.PHONY: test
test: build/hanewinpgp.js | node_modules
	nodeunit

.PHONY: test
test-browser: build/hanewinpgp.browser.js build/tests.js | node_modules build-nodeunit

.PHONY: browserstack
browserstack: build/hanewinpgp.browser.js build/tests.js | node_modules build-nodeunit
	browserstack-runner
