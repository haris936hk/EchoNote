import fitz

doc = fitz.open('Echo Note.pdf')

# Print pages 24-31 (0-indexed: 23-30) which contain Chapter 3
print("=" * 80)
print("CHAPTER 3: REQUIREMENT ENGINEERING - FULL TEXT")
print("=" * 80)

for i in range(23, min(32, len(doc))):
    print(f'\n{"="*80}')
    print(f'PAGE {i+1}')
    print("="*80)
    print(doc[i].get_text())
