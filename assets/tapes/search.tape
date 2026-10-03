# Render from the repo root: vhs assets/tapes/search.tape
Output assets/search.gif

Set Shell bash
Set FontSize 15
Set Width 1110
Set Height 400
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms

Hide
Type "export PS1='> ' && clear"
Enter
Show

Type 'bun examples/quick-search.ts "which animals hunt at night?"'
Sleep 300ms
Enter
Sleep 2s
Type 'bun examples/quick-search.ts "fish that live in water"'
Sleep 300ms
Enter
Sleep 3s
