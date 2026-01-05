import fitz

doc = fitz.open('Echo Note.pdf')
all_text = ''

for i in range(len(doc)):
    text = doc[i].get_text()
    all_text += f'\n--- PAGE {i+1} ---\n' + text

# Find Chapter 3 section
start_idx = all_text.find('Chapter 3:')
end_idx = all_text.find('Chapter 4:', start_idx + 1) if start_idx != -1 else -1

if start_idx != -1 and end_idx != -1:
    chapter3 = all_text[start_idx:end_idx]
    print(chapter3)
else:
    # Fallback: print pages 24-32 (typical Chapter 3 location based on TOC)
    for i in range(23, min(35, len(doc))):
        print(f'\n--- PAGE {i+1} ---\n')
        print(doc[i].get_text())
