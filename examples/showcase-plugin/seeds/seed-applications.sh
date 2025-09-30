#!/bin/bash
# Seed job applications (using posts as placeholder until CPT is implemented)
# Idempotent: safe to run multiple times

set -e

echo "📋 Seeding applications..."

# Function to create application if it doesn't exist
create_application_if_not_exists() {
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
        echo "  ✅ Created application: $title"
    else
        echo "  ℹ️  Application '$title' already exists, skipping..."
    fi
}

# Create sample applications
create_application_if_not_exists \
    "Application: John Smith - Senior WordPress Developer" \
    "application-john-smith-senior-wp-dev" \
    "<p><strong>Applicant:</strong> John Smith</p>
<p><strong>Email:</strong> john.smith@example.com</p>
<p><strong>Applied:</strong> $(date +%Y-%m-%d)</p>
<p><strong>Status:</strong> Pending Review</p>
<p><strong>Cover Letter:</strong></p>
<p>I am excited to apply for the Senior WordPress Developer position. With over 7 years of experience building WordPress solutions, I believe I would be a great fit for your team.</p>"

create_application_if_not_exists \
    "Application: Sarah Johnson - Frontend Engineer" \
    "application-sarah-johnson-frontend" \
    "<p><strong>Applicant:</strong> Sarah Johnson</p>
<p><strong>Email:</strong> sarah.j@example.com</p>
<p><strong>Applied:</strong> $(date -v-1d +%Y-%m-%d 2>/dev/null || date -d '1 day ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Reviewing</p>
<p><strong>Cover Letter:</strong></p>
<p>I'm a React developer with 4 years of experience and a passion for building accessible user interfaces. I've worked extensively with the Gutenberg editor and would love to contribute to your team.</p>"

create_application_if_not_exists \
    "Application: Mike Chen - DevOps Engineer" \
    "application-mike-chen-devops" \
    "<p><strong>Applicant:</strong> Mike Chen</p>
<p><strong>Email:</strong> mike.chen@example.com</p>
<p><strong>Applied:</strong> $(date -v-2d +%Y-%m-%d 2>/dev/null || date -d '2 days ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Shortlisted</p>
<p><strong>Cover Letter:</strong></p>
<p>With extensive experience in WordPress hosting and infrastructure, I've scaled WordPress sites to handle millions of requests. I specialize in Docker, Kubernetes, and CI/CD pipelines.</p>"

create_application_if_not_exists \
    "Application: Emily Rodriguez - Full Stack Developer" \
    "application-emily-rodriguez-fullstack" \
    "<p><strong>Applicant:</strong> Emily Rodriguez</p>
<p><strong>Email:</strong> emily.r@example.com</p>
<p><strong>Applied:</strong> $(date -v-3d +%Y-%m-%d 2>/dev/null || date -d '3 days ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Interview Scheduled</p>
<p><strong>Cover Letter:</strong></p>
<p>I'm a full-stack developer comfortable with both PHP and modern JavaScript. I've built several WordPress plugins and themes using React, and I'm excited about your focus on modern development practices.</p>"

create_application_if_not_exists \
    "Application: David Park - Technical Writer" \
    "application-david-park-tech-writer" \
    "<p><strong>Applicant:</strong> David Park</p>
<p><strong>Email:</strong> david.park@example.com</p>
<p><strong>Applied:</strong> $(date -v-4d +%Y-%m-%d 2>/dev/null || date -d '4 days ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Pending Review</p>
<p><strong>Cover Letter:</strong></p>
<p>As a technical writer with a developer background, I specialize in creating clear, comprehensive documentation. I've documented REST APIs, JavaScript libraries, and developer tools for the past 5 years.</p>"

create_application_if_not_exists \
    "Application: Lisa Wong - Senior WordPress Developer" \
    "application-lisa-wong-senior-wp-dev" \
    "<p><strong>Applicant:</strong> Lisa Wong</p>
<p><strong>Email:</strong> lisa.wong@example.com</p>
<p><strong>Applied:</strong> $(date -v-5d +%Y-%m-%d 2>/dev/null || date -d '5 days ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Rejected</p>
<p><strong>Cover Letter:</strong></p>
<p>I have 3 years of WordPress experience and am eager to grow my skills with your team.</p>
<p><em>Note: Application did not meet experience requirements (5+ years needed).</em></p>"

create_application_if_not_exists \
    "Application: Alex Thompson - Frontend Engineer" \
    "application-alex-thompson-frontend" \
    "<p><strong>Applicant:</strong> Alex Thompson</p>
<p><strong>Email:</strong> alex.t@example.com</p>
<p><strong>Applied:</strong> $(date -v-6d +%Y-%m-%d 2>/dev/null || date -d '6 days ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Reviewing</p>
<p><strong>Cover Letter:</strong></p>
<p>React developer with 5 years experience, including 2 years working with WordPress Gutenberg. I've contributed to several open-source WordPress projects and have strong TypeScript skills.</p>"

create_application_if_not_exists \
    "Application: Rachel Green - DevOps Engineer" \
    "application-rachel-green-devops" \
    "<p><strong>Applicant:</strong> Rachel Green</p>
<p><strong>Email:</strong> rachel.green@example.com</p>
<p><strong>Applied:</strong> $(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Pending Review</p>
<p><strong>Cover Letter:</strong></p>
<p>DevOps engineer with WordPress.com experience. I've worked on infrastructure serving millions of WordPress sites and have deep knowledge of performance optimization.</p>"

create_application_if_not_exists \
    "Application: Tom Wilson - Full Stack Developer" \
    "application-tom-wilson-fullstack" \
    "<p><strong>Applicant:</strong> Tom Wilson</p>
<p><strong>Email:</strong> tom.w@example.com</p>
<p><strong>Applied:</strong> $(date -v-8d +%Y-%m-%d 2>/dev/null || date -d '8 days ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Shortlisted</p>
<p><strong>Cover Letter:</strong></p>
<p>Full-stack WordPress developer with agency experience. I've built custom solutions for Fortune 500 companies and am passionate about clean code and testing.</p>"

create_application_if_not_exists \
    "Application: Nina Patel - Technical Writer" \
    "application-nina-patel-tech-writer" \
    "<p><strong>Applicant:</strong> Nina Patel</p>
<p><strong>Email:</strong> nina.patel@example.com</p>
<p><strong>Applied:</strong> $(date -v-9d +%Y-%m-%d 2>/dev/null || date -d '9 days ago' +%Y-%m-%d)</p>
<p><strong>Status:</strong> Interview Scheduled</p>
<p><strong>Cover Letter:</strong></p>
<p>Technical writer specializing in developer documentation. I have a computer science background and have written documentation for major open-source projects including Gatsby and Next.js.</p>"

echo "✅ Application seeding complete (10 applications created)"
echo ""
