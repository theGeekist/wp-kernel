#!/bin/bash
# Seed job postings with taxonomies
# Idempotent: safe to run multiple times

set -e

echo "📄 Seeding job content..."

# Register custom post type and taxonomies
# This will be done via PHP, but we'll create the content here

# Function to create post if it doesn't exist
create_job_if_not_exists() {
    local title=$1
    local slug=$2
    local content=$3
    
    # Check if post with slug exists
    if wp post list --post_type=post --name="$slug" --format=count | grep -q "^0$"; then
        wp post create \
            --post_type=post \
            --post_status=publish \
            --post_title="$title" \
            --post_name="$slug" \
            --post_content="$content" \
            --porcelain > /dev/null
        echo "  ✅ Created job: $title"
    else
        echo "  ℹ️  Job '$title' already exists, skipping..."
    fi
}

# Create sample job postings
create_job_if_not_exists \
    "Senior WordPress Developer" \
    "senior-wordpress-developer" \
    "<h2>About the Role</h2>
<p>We're looking for an experienced WordPress developer to join our growing team. You'll work on cutting-edge WordPress solutions using modern JavaScript frameworks.</p>

<h2>Requirements</h2>
<ul>
<li>5+ years of WordPress development experience</li>
<li>Expert knowledge of PHP, JavaScript (React), and WordPress APIs</li>
<li>Experience with Gutenberg blocks and the Block Editor</li>
<li>Strong understanding of REST API and WP-CLI</li>
<li>Excellent problem-solving skills</li>
</ul>

<h2>Nice to Have</h2>
<ul>
<li>Experience with WPKernel or similar frameworks</li>
<li>Open source contributions</li>
<li>TypeScript experience</li>
</ul>

<h2>Benefits</h2>
<ul>
<li>Remote work options</li>
<li>Competitive salary</li>
<li>Health insurance</li>
<li>Professional development budget</li>
</ul>"

create_job_if_not_exists \
    "Frontend Engineer (React)" \
    "frontend-engineer-react" \
    "<h2>About the Role</h2>
<p>Join our frontend team to build beautiful, performant user interfaces for our WordPress products.</p>

<h2>Requirements</h2>
<ul>
<li>3+ years of React experience</li>
<li>Strong CSS/SCSS skills</li>
<li>Experience with WordPress Gutenberg editor</li>
<li>Understanding of accessibility standards (WCAG)</li>
<li>Git workflow proficiency</li>
</ul>

<h2>What You'll Do</h2>
<ul>
<li>Build reusable React components</li>
<li>Implement responsive designs</li>
<li>Optimize performance</li>
<li>Collaborate with designers and backend developers</li>
</ul>"

create_job_if_not_exists \
    "DevOps Engineer" \
    "devops-engineer" \
    "<h2>About the Role</h2>
<p>Help us scale our WordPress infrastructure and improve developer workflows.</p>

<h2>Requirements</h2>
<ul>
<li>Experience with Docker and containerization</li>
<li>CI/CD pipeline setup (GitHub Actions, GitLab CI)</li>
<li>Cloud platforms (AWS, GCP, or Azure)</li>
<li>Linux system administration</li>
<li>Monitoring and logging tools</li>
</ul>

<h2>Bonus Points</h2>
<ul>
<li>WordPress hosting experience</li>
<li>Kubernetes knowledge</li>
<li>Infrastructure as Code (Terraform, Ansible)</li>
</ul>"

create_job_if_not_exists \
    "Full Stack Developer" \
    "full-stack-developer" \
    "<h2>About the Role</h2>
<p>We need a versatile developer comfortable with both frontend and backend work.</p>

<h2>Requirements</h2>
<ul>
<li>PHP and JavaScript proficiency</li>
<li>WordPress theme and plugin development</li>
<li>React or Vue.js experience</li>
<li>MySQL database design</li>
<li>REST API development</li>
</ul>

<h2>Day-to-Day</h2>
<ul>
<li>Build features across the full stack</li>
<li>Write clean, tested code</li>
<li>Participate in code reviews</li>
<li>Troubleshoot production issues</li>
</ul>"

create_job_if_not_exists \
    "Technical Writer" \
    "technical-writer" \
    "<h2>About the Role</h2>
<p>Help developers understand our products through excellent documentation.</p>

<h2>Requirements</h2>
<ul>
<li>Strong writing and editing skills</li>
<li>Experience documenting developer tools or APIs</li>
<li>Basic understanding of HTML/CSS/JavaScript</li>
<li>Ability to explain complex concepts simply</li>
</ul>

<h2>Responsibilities</h2>
<ul>
<li>Write API documentation</li>
<li>Create tutorials and guides</li>
<li>Maintain changelog and release notes</li>
<li>Collaborate with engineering team</li>
</ul>"

echo "✅ Job content seeding complete (5 jobs created)"
echo ""
