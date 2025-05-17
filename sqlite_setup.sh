#!/bin/bash

# Define the SQLite database file
DB_FILE="stuff.db"

# Check if the SQLite file already exists
if [ -f "$DB_FILE" ]; then
  echo "Database file '$DB_FILE' already exists."
  exit 1
fi

# Create the SQLite database and execute the SQL commands
sqlite3 $DB_FILE <<EOF
-- Create table for storing IP addresses
CREATE TABLE IF NOT EXISTS banned_ips (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	ip VARCHAR(63) UNIQUE NOT NULL
);

CREATE TABLE mods (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pass VARCHAR(255) UNIQUE NOT NULL,
	perms INT
);

-- Commit the changes
EOF

# Check if the database was created successfully
if [ -f "$DB_FILE" ]; then
  echo "Database '$DB_FILE' created successfully and tables initialized."
else
  echo "Failed to create database."
  exit 1
fi
