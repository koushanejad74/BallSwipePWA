#!/usr/bin/env python3
"""
Simple script to generate PWA icons using PIL (Python Imaging Library)
This creates basic colored icons with the app name/emoji as placeholders
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    # Icon sizes needed for PWA
    sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512]
    
    # Create icons directory if it doesn't exist
    icons_dir = "icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    for size in sizes:
        # Create a new image with a gradient-like background
        img = Image.new('RGB', (size, size), color='#2196F3')
        draw = ImageDraw.Draw(img)
        
        # Add a circle gradient effect
        center = size // 2
        for i in range(center):
            alpha = int(255 * (center - i) / center)
            color = (33 + i, 150 + i, 243)
            draw.ellipse([center - i, center - i, center + i, center + i], fill=color)
        
        # Add a ball emoji or circle in the center
        ball_radius = max(size // 8, 4)
        ball_color = '#FF6B6B'
        draw.ellipse([
            center - ball_radius, 
            center - ball_radius, 
            center + ball_radius, 
            center + ball_radius
        ], fill=ball_color)
        
        # Add a small highlight
        highlight_radius = max(ball_radius // 3, 1)
        highlight_x = center - ball_radius // 2
        highlight_y = center - ball_radius // 2
        draw.ellipse([
            highlight_x - highlight_radius,
            highlight_y - highlight_radius,
            highlight_x + highlight_radius,
            highlight_y + highlight_radius
        ], fill='#FFB6C1')
        
        # Save the icon
        filename = f"icons/icon-{size}x{size}.png"
        img.save(filename, 'PNG', optimize=True)
        print(f"Generated {filename}")
    
    print("✅ All PWA icons generated successfully!")
    
except ImportError:
    print("⚠️  PIL (Pillow) not found. Installing...")
    import subprocess
    import sys
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
        print("✅ Pillow installed successfully! Please run this script again.")
    except subprocess.CalledProcessError:
        print("❌ Failed to install Pillow. You can manually create the icons or install Pillow with:")
        print("   pip install Pillow")
        print("\nFor now, I'll create simple colored square placeholders...")
        
        # Fallback: create simple colored files using basic methods
        import os
        os.makedirs("icons", exist_ok=True)
        
        # Create simple HTML-based icon generation
        html_content = """
<!DOCTYPE html>
<html>
<head><title>Icon Generator</title></head>
<body>
<canvas id="canvas"></canvas>
<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
    canvas.width = size;
    canvas.height = size;
    
    // Create gradient background
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(1, '#2196F3');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Add ball
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/8, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();
    
    // Download the image
    const link = document.createElement('a');
    link.download = `icon-${size}x${size}.png`;
    link.href = canvas.toDataURL();
    link.click();
});
</script>
</body>
</html>"""
        
        with open("generate_icons.html", "w") as f:
            f.write(html_content)
        
        print("📄 Created generate_icons.html - open this in a browser to download icons")
        
except Exception as e:
    print(f"❌ Error generating icons: {e}")
    print("You can manually create PNG icons for the following sizes:")
    print("16x16, 32x32, 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512")