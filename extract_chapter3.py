import fitz

doc = fitz.open('Echo Note.pdf')
chapter3_text = ''
in_chapter3 = False

for i in range(len(doc)):
    text = doc[i].get_text()
    if 'CHAPTER 3' in text.upper() or 'FUNCTIONAL REQUIREMENTS' in text.upper():
        in_chapter3 = True
    if in_chapter3:
        chapter3_text += f'\n--- PAGE {i+1} ---\n' + text
    if 'CHAPTER 4' in text.upper() and in_chapter3 and len(chapter3_text) > 1000:
        break

print(chapter3_text)
