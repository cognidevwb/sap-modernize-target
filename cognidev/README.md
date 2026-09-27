# cognidev/

This folder is yours.

Every playbook you run copies its editable text here — the manifest, the
questions it asks, the rules it follows. You can read it, and you can change it.

- **Nothing here is ever overwritten.** If you edit a file, later runs keep your
  version. A file only gets written when it isn't already here.
- **Only text lands here** — Markdown and YAML. Tools, binaries and build output
  stay where they belong.
- **Commit it if you want to.** Unlike `.cognidev/`, which the workbench derives
  and rewrites on every sweep, this folder is part of your project.

Mind the dot: `.cognidev/` is ours and is rewritten, `cognidev/` is yours and is
not.

Each playbook gets its own subfolder, named after it.
