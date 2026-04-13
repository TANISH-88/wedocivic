import shutil
import os

sizes = [72, 96, 128, 144, 152, 192, 384, 512]
source_path = os.path.join('public', 'icons', 'logo.png')
output_dir = os.path.join('public', 'icons')

print('🎨 Generating PWA icons from logo.png...\n')

if not os.path.exists(source_path):
    print(f'❌ Error: logo.png not found at {source_path}')
    exit(1)

for size in sizes:
    dest_path = os.path.join(output_dir, f'icon-{size}x{size}.png')
    shutil.copy(source_path, dest_path)
    print(f'✅ Created icon-{size}x{size}.png')

print('\n🎉 Icons generated!')
print('Note: These are copies of logo.png, not resized.')
print('For production, consider using https://realfavicongenerator.net/')
