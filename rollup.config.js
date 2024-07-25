import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const buildPath = "dist";

const importsGeneral = {
  // CORE Gnome dependencies
  "gi://Gdk?version=4.0": { name: "gi://Gdk" },
  "gi://Gio?version=2.0": { name: "gi://Gio" },
  "gi://GdkPixbuf?version=2.0": { name: "gi://GdkPixbuf" },
  "gi://Graphene?version=1.0": { name: "gi://Graphene" },
  "gi://Pango?version=1.0": { name: "gi://Pango" },
  "gi://Soup?version=3.0": { name: "gi://Soup" },
  "gi://Meta?version=14": { name: "gi://Meta" },
  "gi://Clutter?version=14": { name: "gi://Clutter" },
  "gi://Cogl?version=14": { name: "gi://Cogl" },
  "gi://Shell?version=14": { name: "gi://Shell" },
  "gi://St?version=14": { name: "gi://St" },

  // non core dependencies (can have version specifier!)
  "gi://Gda?version=5.0": { name: "gi://Gda?version>=5.0" }, // We officially support (it's also typed!) both 5.0 and 6.0
  "gi://GSound?version=1.0": { name: "gi://GSound" },
  "gi://GObject?version=2.0": { name: "gi://GObject" },
  "gi://GLib?version=2.0": { name: "gi://GLib" },
  "gi://Gtk?version=4.0": { name: "gi://Gtk" },
  "gi://Adw?version=1": { name: "gi://Adw" },

  // extension.js + prefs.js resources
  "@girs/gnome-shell/misc/animationUtils": {
    name: "resource://EXT_ROOT/misc/animationUtils.js",
  },
  "@girs/gnome-shell/extensions/extension": {
    name: "resource://EXT_ROOT/extensions/extension.js",
  },
  "@girs/gnome-shell/ui/layout": {
    name: "resource://EXT_ROOT/ui/layout.js",
  },
  "@girs/gnome-shell/ui/main": { name: "resource://EXT_ROOT/ui/main.js" },
  "@girs/gnome-shell/ui/messageTray": {
    name: "resource://EXT_ROOT/ui/messageTray.js",
  },
  "@girs/gnome-shell/ui/lightbox": {
    name: "resource://EXT_ROOT/ui/lightbox.js",
  },
  "@girs/gnome-shell/ui/dialog": {
    name: "resource://EXT_ROOT/ui/dialog.js",
  },
  "@girs/gnome-shell/ui/modalDialog": {
    name: "resource://EXT_ROOT/ui/modalDialog.js",
  },
  "@girs/gnome-shell/ui/popupMenu": {
    name: "resource://EXT_ROOT/ui/popupMenu.js",
  },
  "@girs/gnome-shell/ui/panelMenu": {
    name: "resource://EXT_ROOT/ui/panelMenu.js",
  },
  //compatibility imports
  "@girs/gnome-shell-45/ui/messageTray": {
    name: "resource://EXT_ROOT/ui/messageTray.js",
  },
};

// prefs.js specific resources
const importsPrefs = {
  ...importsGeneral,
  "@girs/gnome-shell/extensions/prefs": {
    name: "resource://EXT_ROOT/extensions/prefs.js",
  },
};

const ExtensionEntries = Object.fromEntries(
  Object.entries(importsGeneral).map(([name, { name: mapping }]) => {
    return [name, mapping.replaceAll(/EXT_ROOT/g, "/org/gnome/shell")];
  })
);

const PreferencesEntries = Object.fromEntries(
  Object.entries(importsPrefs).map(([name, { name: mapping }]) => {
    return [
      name,
      mapping.replaceAll(/EXT_ROOT/g, "/org/gnome/Shell/Extensions/js"),
    ];
  })
);

const thirdParty = ["clrc"];

const gnomeShellExternalModules = [
  /^resource:\/\/\/org\/gnome\/(shell|Shell\/Extensions)\/.*/,
];

const gjsModules = [
  ...Object.keys(importsGeneral),
  ...Object.keys(importsPrefs),
  ...gnomeShellExternalModules,
];

const globalDefinitionImports = ["@girs/gnome-shell/extensions/global"];

const GlobalEntries = {};

const thirdPartyBuild = thirdParty.map((pkg) => {
  const sanitizedPkg = pkg
    .split("/")
    .join("_")
    .replaceAll("-", "_")
    .replaceAll(".", "_")
    .replaceAll("@", "");
  GlobalEntries[pkg] = `./thirdparty/${sanitizedPkg}.js`;

  return {
    input: `node_modules/${pkg}`,
    output: {
      file: `${buildPath}/thirdparty/${sanitizedPkg}.js`,
      format: "esm",
      name: "lib",
      generatedCode: {
        constBindings: true,
      },
    },
    treeshake: {
      moduleSideEffects: "no-external",
    },
    plugins: [
      nodeResolve({
        preferBuiltins: false,
      }),
    ],
  };
});

export default [
  ...thirdPartyBuild,
  {
    input: "src/extension.ts",
    treeshake: {
      moduleSideEffects: "no-external",
    },
    output: {
      file: `${buildPath}/extension.js`,
      format: "esm",
      name: "init",
      exports: "default",
      paths: { ...ExtensionEntries, ...GlobalEntries },
      generatedCode: {
        constBindings: true,
      },
    },
    external: [...thirdParty, ...gjsModules, ...globalDefinitionImports],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        include: [],
      }),
    ],
  },
  {
    input: "src/prefs.ts",
    treeshake: {
      moduleSideEffects: "no-external",
    },
    output: {
      file: `${buildPath}/prefs.js`,
      format: "esm",
      exports: "default",
      paths: { ...PreferencesEntries, ...GlobalEntries },
      generatedCode: {
        constBindings: true,
      },
    },
    external: [...thirdParty, ...gjsModules],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        include: [],
      }),
    ],
  },
];
