#!/bin/sh

# Loop through all files in /run/secrets/
for secret in /run/secrets/*; do
  # Extract the filename as the variable name
  secret_name=$(basename "$secret")
  # Read the secret file content into a variable
  secret_value=$(cat "$secret")
  # Export it as an environment variable
  export "$secret_name=$secret_value"
done

# Execute the main container command
exec "$@"
