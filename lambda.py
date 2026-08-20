import json
import boto3
import re
from datetime import datetime
from zoneinfo import ZoneInfo


# ==========================================
# S3 CONFIGURATION
# ==========================================

BUCKET_NAME = "phase-raw-csv-upload-2026-406194433867-ap-south-1-an"

AWS_REGION = "ap-south-1"

UPLOAD_PREFIX = "uploads"


# ==========================================
# S3 CLIENT
# ==========================================

# IMPORTANT:
# Explicitly use the S3 regional endpoint.
# This prevents the 307 Temporary Redirect problem.

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com"
)


# ==========================================
# SANITIZE USERNAME
# ==========================================

def sanitize_username(username):

    username = str(username).strip()

    username = re.sub(
        r"[^a-zA-Z0-9._-]",
        "_",
        username
    )

    return username


# ==========================================
# SANITIZE FILENAME
# ==========================================

def sanitize_filename(filename):

    filename = str(filename).strip()

    # Remove folder/path information
    filename = filename.replace("\\", "/").split("/")[-1]

    filename = re.sub(
        r"[^a-zA-Z0-9._-]",
        "_",
        filename
    )

    return filename


# ==========================================
# RESPONSE HELPER
# ==========================================

def response(status_code, body):

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        "body": json.dumps(body)
    }


# ==========================================
# LAMBDA HANDLER
# ==========================================

def lambda_handler(event, context):

    try:

        # ======================================
        # READ REQUEST BODY
        # ======================================

        body = event.get("body", {})

        if isinstance(body, str):
            body = json.loads(body)


        # ======================================
        # GET USERNAME
        # ======================================

        username = body.get("username")

        if not username:

            return response(
                400,
                {
                    "error": "Username is required"
                }
            )


        username = sanitize_username(username)


        if not username:

            return response(
                400,
                {
                    "error": "Invalid username"
                }
            )


        # ======================================
        # GET FILES
        # ======================================

        files = body.get("files", [])

        if not files:

            return response(
                400,
                {
                    "error": "No files provided"
                }
            )


        # ======================================
        # CREATE TIMESTAMP
        # ======================================

        # Example:
        # 2026-08-20_00-34-57-914

        now = datetime.now(
            ZoneInfo("Asia/Kolkata")
        )

        timestamp = now.strftime(
            "%Y-%m-%d_%H-%M-%S-%f"
        )[:23]


        # ======================================
        # CREATE USER/TIMESTAMP FOLDER
        # ======================================

        folder_path = (
            f"{UPLOAD_PREFIX}/"
            f"{username}/"
            f"{timestamp}/"
        )


        print("===================================")
        print("Username:", username)
        print("Timestamp:", timestamp)
        print("Upload folder:", folder_path)
        print("===================================")


        # ======================================
        # GENERATE PRESIGNED URLS
        # ======================================

        results = []


        for file_info in files:

            filename = file_info.get("filename")

            content_type = file_info.get(
                "contentType",
                "text/csv"
            )


            # ==================================
            # VALIDATE FILENAME
            # ==================================

            if not filename:

                results.append({
                    "success": False,
                    "error": "Filename is missing"
                })

                continue


            filename = sanitize_filename(filename)


            # ==================================
            # ONLY CSV FILES
            # ==================================

            if not filename.lower().endswith(".csv"):

                results.append({
                    "filename": filename,
                    "success": False,
                    "error": "Only CSV files are allowed"
                })

                continue


            # ==================================
            # FINAL S3 KEY
            # ==================================

            s3_key = (
                f"{folder_path}"
                f"{filename}"
            )


            print("S3 Key:", s3_key)


            # ==================================
            # GENERATE PRESIGNED URL
            # ==================================

            upload_url = s3.generate_presigned_url(

                ClientMethod="put_object",

                Params={
                    "Bucket": BUCKET_NAME,
                    "Key": s3_key,
                    "ContentType": content_type
                },

                ExpiresIn=900
            )


            print("Presigned URL generated for:", filename)


            # ==================================
            # ADD RESULT
            # ==================================

            results.append({

                "filename": filename,

                "success": True,

                "uploadUrl": upload_url,

                "contentType": content_type,

                "s3Key": s3_key

            })


        # ======================================
        # RETURN SUCCESS
        # ======================================

        return response(
            200,
            {
                "message": "Upload URLs generated successfully",

                "username": username,

                "timestamp": timestamp,

                "files": results
            }
        )


    # ==========================================
    # ERROR HANDLING
    # ==========================================

    except Exception as e:

        print("ERROR:", str(e))

        return response(
            500,
            {
                "error": str(e)
            }
        )