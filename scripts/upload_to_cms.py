#!/usr/bin/env python3
"""
upload_to_cms.py

This script uploads new or modified large assets from a specific local directory
directly to the CMS via its API. It reads the CMS API endpoint and Authentication
Token from environment variables.
"""

import os
import sys
import logging
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def main():
    # Define the target directory for outgoing files
    target_dir = os.path.join(os.getcwd(), 'assets', 'pending_upload')

    # Create the directory if it doesn't exist
    if not os.path.exists(target_dir):
        logging.info(f"Target directory '{target_dir}' does not exist. Creating it.")
        try:
            os.makedirs(target_dir)
        except Exception as e:
            logging.error(f"Failed to create directory '{target_dir}': {e}")
            sys.exit(1)

    # Retrieve configuration from environment variables
    cms_upload_url = os.environ.get('CMS_UPLOAD_URL')
    cms_api_key = os.environ.get('CMS_API_KEY')

    if not cms_upload_url or not cms_api_key:
        logging.error("Missing required environment variables: CMS_UPLOAD_URL and/or CMS_API_KEY")
        sys.exit(1)

    headers = {
        'Authorization': f'Bearer {cms_api_key}'
    }

    # Iterate through all files in the target directory
    files_in_dir = os.listdir(target_dir)
    if not files_in_dir:
        logging.info(f"No files found in '{target_dir}' to upload.")
        sys.exit(0)

    for filename in files_in_dir:
        filepath = os.path.join(target_dir, filename)

        # Skip directories
        if not os.path.isfile(filepath):
            continue

        logging.info(f"Attempting to upload '{filename}'...")

        try:
            with open(filepath, 'rb') as f:
                files = {'file': (filename, f)}
                # Upload using multipart/form-data
                response = requests.post(cms_upload_url, headers=headers, files=files)

            if response.status_code in (200, 201):
                logging.info(f"Successfully uploaded '{filename}'. Response: {response.status_code}")
            else:
                logging.error(f"Failed to upload '{filename}'. Status Code: {response.status_code}. Response: {response.text}")

        except requests.exceptions.RequestException as e:
            logging.error(f"Connection exception occurred while uploading '{filename}': {e}")
        except Exception as e:
            logging.error(f"An unexpected error occurred while processing '{filename}': {e}")

if __name__ == '__main__':
    main()
