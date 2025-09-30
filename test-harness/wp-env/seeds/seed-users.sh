#!/bin/bash
# Seed test users for development and testing
# Idempotent: safe to run multiple times

set -e

echo "👥 Seeding users..."

# Function to create user if it doesn't exist
create_user_if_not_exists() {
    local username=$1
    local email=$2
    local role=$3
    local password=$4
    local display_name=$5
    
    if wp user get "$username" > /dev/null 2>&1; then
        echo "  ℹ️  User '$username' already exists, skipping..."
    else
        wp user create "$username" "$email" \
            --role="$role" \
            --user_pass="$password" \
            --display_name="$display_name" \
            --porcelain > /dev/null
        echo "  ✅ Created user: $username ($role)"
    fi
}

# Admin user (already exists from wp-env)
# username: admin
# password: password

# Hiring Manager (can manage jobs and applications)
create_user_if_not_exists \
    "hiring_manager" \
    "hiring@example.com" \
    "editor" \
    "password" \
    "Hiring Manager"

# Job Seeker (can submit applications)
create_user_if_not_exists \
    "job_seeker" \
    "seeker@example.com" \
    "subscriber" \
    "password" \
    "Job Seeker"

# Employer (can create job postings)
create_user_if_not_exists \
    "employer" \
    "employer@example.com" \
    "author" \
    "password" \
    "Employer"

# Developer (for testing purposes)
create_user_if_not_exists \
    "developer" \
    "dev@example.com" \
    "administrator" \
    "password" \
    "Developer"

echo "✅ User seeding complete"
echo ""
echo "Test Users Created:"
echo "  • admin / password (administrator)"
echo "  • hiring_manager / password (editor)"
echo "  • job_seeker / password (subscriber)"
echo "  • employer / password (author)"
echo "  • developer / password (administrator)"
echo ""
