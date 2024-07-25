NAME=mpd-lyrics-osd
DOMAIN=daizu.dev

.PHONY: all init_pot pack install clean

all: dist

node_modules: package.json
	pnpm install

dist: node_modules
	pnpm rollup -c
	cp metadata.json dist/
	cp -r schemas dist/
	cp -r po dist/
	cp -r src/ui dist/
	cp src/stylesheet.css dist/

init_pot: dist
	xgettext --from-code=UTF-8 --output=po/$(NAME)@$(DOMAIN).pot dist/*.js dist/ui/*.ui
	msgmerge --update po/en.po po/$(NAME)@$(DOMAIN).pot
	msgmerge --update po/ja.po po/$(NAME)@$(DOMAIN).pot

$(NAME)@$(DOMAIN).shell-extension.zip: dist
	gnome-extensions pack --extra-source=ui --extra-source=thirdparty --podir=po --schema=schemas/org.gnome.shell.extensions.$(NAME).gschema.xml -f dist

pack: $(NAME)@$(DOMAIN).shell-extension.zip

install: $(NAME)@$(DOMAIN).shell-extension.zip
	gnome-extensions install -f $(NAME)@$(DOMAIN).shell-extension.zip
	@rm $(NAME)@$(DOMAIN).shell-extension.zip
	@rm -rf dist

clean:
	@rm -rf dist node_modules $(NAME)@$(DOMAIN).shell-extension.zip
