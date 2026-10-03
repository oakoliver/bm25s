# Render from the repo root: vhs assets/tapes/variants.tape

Set Shell bash
Set FontSize 15
Set Width 1090
Set Height 260
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms

Hide
Type "export PS1='> ' && clear"
Enter
Show

Type 'bun examples/variants.ts "cats that sleep"'
Sleep 300ms
Enter
Sleep 2.5s
Screenshot assets/variants.png
