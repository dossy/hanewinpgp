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
	@mkdir -p build vendor

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
build: build/hanewinpgp.js build/hanewinpgp.min.js | dirs

x.foo.js:
	echo $(subst .js,-$(npm_package_version).js,$@)

build/hanewinpgp.js: src/*.js | dirs package.json
	( echo -e "$$banner\n"; \
		echo -e "var VERSION = '$(npm_package_version)';\n"; \
		cat $^ ) >$@

build/hanewinpgp.min.js: build/hanewinpgp.js | dirs node_modules
	uglifyjs $^ -o $@ --preamble "$$banner"

.PHONY: build-browser
build-browser: vendor/node_modules/buffer build/hanewinpgp.loader.js \
	build/hanewinpgp.browser.js build/hanewinpgp.browser.min.js \
	build/hanewinpgp.legacy.browser.js build/hanewinpgp.legacy.browser.min.js | dirs

build/hanewinpgp.loader.js: src/loader/index.js | dirs package.json node_modules
	( echo -e "$$banner_browser\n"; \
		echo -e "var VERSION = '$(npm_package_version)';\n"; \
		cat $^ ) | browserify - >$@

build/hanewinpgp.browser.js: build/hanewinpgp.js | dirs package.json node_modules
	( echo -e "$$banner_browser\n"; \
		browserify -r ./build/hanewinpgp.js:hanewinpgp -s hanewinpgp -x crypto ) \
		>$@

build/hanewinpgp.browser.min.js: build/hanewinpgp.browser.js | dirs package.json node_modules
	uglifyjs $^ -o $@ --preamble "$$banner_browser"

build/hanewinpgp.legacy.browser.js: build/hanewinpgp.js | dirs package.json node_modules
	( echo -e "$$banner_browser\n"; \
		browserify -r ./build/hanewinpgp.js:hanewinpgp -s hanewinpgp \
		-r ./vendor/node_modules/buffer/index.js:buffer -x crypto ) \
		>$@

build/hanewinpgp.legacy.browser.min.js: build/hanewinpgp.legacy.browser.js | dirs package.json node_modules
	uglifyjs $^ -o $@ --preamble "$$banner_browser"

node_modules: | package.json
	# Apparently, npm install doesn't update node_modules stamp.
	npm install # && touch node_modules

vendor/node_modules/buffer: | dirs
	npm install --prefix=./vendor --no-save buffer@'<5.0.0'

.PHONY: build-nodeunit
build-nodeunit: node_modules/nodeunit/dist/browser/nodeunit.js | node_modules

node_modules/nodeunit/dist/browser/nodeunit.js: node_modules
	cd node_modules/nodeunit && make -i browser

build/tests.loader.js: src/loader/tests.js | dirs package.json node_modules
	browserify $^ >$@

build/tests.js: test/encrypt.js build/hanewinpgp.js | node_modules
	browserify -r ./test/encrypt.js -s tests -o $@ \
		-x tmp -x fs -x child_process -x crypto

build/tests.legacy.js: test/encrypt.js build/hanewinpgp.js | node_modules
	browserify -r ./test/encrypt.js:tests -s tests -o $@ \
		-r ./vendor/node_modules/buffer/index.js:buffer \
		-x tmp -x fs -x child_process -x crypto

.PHONY: dist
dist: build build-browser
	cp -v build/hanewin*.js dist/

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

.PHONY: test-browser
test-browser: build/tests.loader.js build/tests.js build/tests.legacy.js | node_modules build-nodeunit

.PHONY: browserstack
browserstack: build/tests.js | node_modules build-nodeunit
	browserstack-runner
