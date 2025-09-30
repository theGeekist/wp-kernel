#!/bin/bash
# Seed media files (sample CV/resume)
# Idempotent: safe to run multiple times

set -e

echo "📎 Seeding media files..."

# Create a sample CV/resume file if it doesn't exist
UPLOAD_DIR=$(wp eval 'echo wp_upload_dir()["basedir"];' 2>/dev/null || echo "/var/www/html/wp-content/uploads")
CV_FILE="$UPLOAD_DIR/sample-cv.pdf"

if [ -f "$CV_FILE" ]; then
    echo "  ℹ️  Sample CV already exists, skipping..."
else
    # Create a simple text-based PDF placeholder
    # In production, this would be actual PDF files
    cat > "$CV_FILE" << 'EOF'
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 150
>>
stream
BT
/F1 18 Tf
50 700 Td
(Sample Resume - John Smith) Tj
0 -50 Td
/F1 12 Tf
(Email: john.smith@example.com) Tj
0 -20 Td
(Phone: (555) 123-4567) Tj
0 -40 Td
(Experience: 7 years WordPress Development) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000260 00000 n
0000000339 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
539
%%EOF
EOF
    echo "  ✅ Created sample CV: sample-cv.pdf"
fi

# Import to WordPress media library
if wp media list --field=file --format=csv 2>/dev/null | grep -q "sample-cv.pdf"; then
    echo "  ℹ️  Sample CV already in media library, skipping..."
else
    if [ -f "$CV_FILE" ]; then
        wp media import "$CV_FILE" --title="Sample Resume - John Smith" --porcelain > /dev/null 2>&1 || true
        echo "  ✅ Imported CV to media library"
    fi
fi

# Create sample profile images (placeholder text files for now)
PROFILE_IMAGES=("john-smith.jpg" "sarah-johnson.jpg" "mike-chen.jpg")
for img in "${PROFILE_IMAGES[@]}"; do
    IMG_FILE="$UPLOAD_DIR/$img"
    if [ ! -f "$IMG_FILE" ]; then
        # Create a minimal placeholder (in production, use actual images)
        echo "Placeholder profile image: $img" > "$IMG_FILE"
        echo "  ✅ Created placeholder: $img"
    else
        echo "  ℹ️  Image '$img' already exists, skipping..."
    fi
done

echo "✅ Media seeding complete"
echo ""
echo "Media files created:"
echo "  • sample-cv.pdf (in uploads and media library)"
echo "  • Profile image placeholders (john-smith.jpg, sarah-johnson.jpg, mike-chen.jpg)"
echo ""
echo "📝 Note: In production, replace placeholders with actual images/PDFs"
echo ""
